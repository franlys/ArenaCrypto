"use client";

import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { useState, useEffect } from "react";
import { supabase } from "../../lib/supabase";
import styles from "./WalletHub.module.css";

// USDC on Polygon Mainnet (native USDC, 6 decimals)
const USDC_ADDRESS = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as `0x${string}`;
const ESCROW_ADDRESS = (process.env.NEXT_PUBLIC_ESCROW_ADDRESS ?? "0x0000000000000000000000000000000000000000") as `0x${string}`;

const ERC20_TRANSFER_ABI = [
  {
    name: "transfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs:  [{ name: "to", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export default function WalletHub() {
  const { address, isConnected } = useAccount();

  // On-chain USDC balance
  const { data: usdcBalance } = useBalance({
    address,
    token: USDC_ADDRESS,
  });

  // MATIC balance
  const { data: maticBalance } = useBalance({ address });

  // Internal Arena balance
  const [arenaBalance, setArenaBalance] = useState<number>(0);
  const [loadingBalance, setLoadingBalance] = useState(true);

  // Deposit modal state
  const [depositAmount, setDepositAmount] = useState("");
  const [showDeposit, setShowDeposit]     = useState(false);

  // Withdraw modal state
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [showWithdraw, setShowWithdraw]     = useState(false);
  const [txStatus, setTxStatus]             = useState<string | null>(null);

  // wagmi write contract hook
  const { writeContract, data: txHash, isPending: isTxPending, error: txError } = useWriteContract();

  // Wait for deposit tx confirmation
  const { isSuccess: isDepositConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Fetch internal balance
  useEffect(() => {
    async function fetchBalance() {
      if (!address) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("wallets")
        .select("balance_stablecoin")
        .eq("user_id", user.id)
        .single();

      if (data) setArenaBalance(Number(data.balance_stablecoin));
      setLoadingBalance(false);
    }

    if (isConnected) fetchBalance();
  }, [address, isConnected]);

  // Credit deposit once tx is confirmed on-chain
  useEffect(() => {
    if (!isDepositConfirmed || !txHash || !depositAmount) return;

    async function creditDeposit() {
      try {
        setTxStatus("Acreditando en cuenta Arena…");
        const { error } = await supabase.rpc("credit_deposit", {
          p_tx_hash: txHash,
          p_amount:  parseFloat(depositAmount),
        });
        if (error) throw error;

        setArenaBalance((prev) => prev + parseFloat(depositAmount));
        setTxStatus("¡Depósito acreditado!");
        setDepositAmount("");
        setShowDeposit(false);
      } catch (e: any) {
        setTxStatus("Error acreditando: " + e.message);
      }
    }

    creditDeposit();
  }, [isDepositConfirmed, txHash, depositAmount]);

  const handleDeposit = () => {
    const amount = parseFloat(depositAmount);
    if (!amount || amount <= 0) return;
    setTxStatus("Aprueba la transacción en tu wallet…");

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (writeContract as any)({
      address:      USDC_ADDRESS,
      abi:          ERC20_TRANSFER_ABI,
      functionName: "transfer",
      args:         [ESCROW_ADDRESS, parseUnits(depositAmount, 6)],
    });
  };

  const handleWithdraw = async () => {
    const amount = parseFloat(withdrawAmount);
    if (!amount || amount <= 0 || amount > arenaBalance) return;

    setTxStatus("Procesando retiro…");
    try {
      const { error } = await supabase.rpc("request_withdrawal", {
        p_amount:     amount,
        p_to_address: address!,
      });
      if (error) throw error;

      setArenaBalance((prev) => prev - amount);
      setTxStatus("Retiro registrado. El pago se procesará en 24h.");
      setWithdrawAmount("");
      setShowWithdraw(false);
    } catch (e: any) {
      setTxStatus("Error: " + e.message);
    }
  };

  if (!isConnected) {
    return (
      <div className={`${styles.hubCard} glass-panel`}>
        <p className={styles.placeholder}>Conecta tu wallet para ver tus balances y depositar.</p>
      </div>
    );
  }

  return (
    <div className={styles.hubContainer}>
      <div className={`${styles.hubCard} glass-panel`}>
        <div className={styles.header}>
          <h3 className="font-orbitron">Estado de Cuenta</h3>
          <span className={styles.networkBadge}>Polygon Mainnet</span>
        </div>

        <div className={styles.balances}>
          {/* On-chain USDC */}
          <div className={styles.balanceItem}>
            <span className={styles.label}>USDC EN WALLET</span>
            <div className={styles.valueRow}>
              <span className={styles.value}>
                {usdcBalance ? parseFloat(formatUnits(usdcBalance.value, 6)).toFixed(2) : "—"}
              </span>
              <span className={styles.symbol}>USDC</span>
            </div>
            <span className={styles.hint}>
              MATIC: {maticBalance ? parseFloat(maticBalance.formatted).toFixed(4) : "—"}
            </span>
          </div>

          {/* Internal balance */}
          <div className={`${styles.balanceItem} ${styles.primaryBalance}`}>
            <span className={styles.label}>BALANCE ARENA</span>
            <div className={styles.valueRow}>
              <span className={`${styles.value} neon-text-cyan`}>
                {loadingBalance ? "—" : arenaBalance.toFixed(2)}
              </span>
              <span className={styles.symbol}>USDC</span>
            </div>
            <p className={styles.hint}>Sin gas · transacciones instantáneas.</p>
          </div>
        </div>

        {/* Action buttons */}
        <div className={styles.actions}>
          <button
            className="btn-primary"
            style={{ flex: 1 }}
            onClick={() => { setShowDeposit(true); setShowWithdraw(false); setTxStatus(null); }}
          >
            DEPOSITAR
          </button>
          <button
            className={styles.btnSecondary}
            onClick={() => { setShowWithdraw(true); setShowDeposit(false); setTxStatus(null); }}
          >
            RETIRAR
          </button>
        </div>

        {/* Deposit panel */}
        {showDeposit && (
          <div className={styles.txPanel}>
            <label className={styles.txLabel}>MONTO A DEPOSITAR (USDC)</label>
            <div className={styles.txRow}>
              <input
                type="number"
                min="1"
                placeholder="10"
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                className={styles.txInput}
              />
              <button
                className="btn-primary"
                onClick={handleDeposit}
                disabled={isTxPending || !depositAmount}
              >
                {isTxPending ? "FIRMANDO…" : "CONFIRMAR"}
              </button>
            </div>
            {txError && <p className={styles.txError}>{txError.message.slice(0, 120)}</p>}
            {txStatus && <p className={styles.txStatus}>{txStatus}</p>}
            <p className={styles.txNote}>
              Se transferirán {depositAmount || "0"} USDC desde tu wallet a la escrow de ArenaCrypto en Polygon.
            </p>
          </div>
        )}

        {/* Withdraw panel */}
        {showWithdraw && (
          <div className={styles.txPanel}>
            <label className={styles.txLabel}>MONTO A RETIRAR (USDC)</label>
            <div className={styles.txRow}>
              <input
                type="number"
                min="1"
                max={arenaBalance}
                placeholder="10"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className={styles.txInput}
              />
              <button
                className="btn-primary"
                onClick={handleWithdraw}
                disabled={!withdrawAmount || parseFloat(withdrawAmount) > arenaBalance}
              >
                RETIRAR
              </button>
            </div>
            {txStatus && <p className={styles.txStatus}>{txStatus}</p>}
            <p className={styles.txNote}>
              Disponible: {arenaBalance.toFixed(2)} USDC · Procesado en 24h.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
