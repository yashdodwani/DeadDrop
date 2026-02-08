import React, { useState } from "react";
import { useAccount, useWalletClient, usePublicClient } from "wagmi";
import { Gavel, Fingerprint, AlertTriangle, ArrowRight, CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { DEAD_DROP_REGISTRY_ADDRESS, DEAD_DROP_REGISTRY_ABI } from "../monad/deadDropRegistry";
import { monadTestnet } from "../../waqmi.config";

const Accusation = ({ caseData, onResetGame, onSuccessfulSolve, mysteryId, salt }) => {
  const [accusedName, setAccusedName] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [murdererName, setMurdererName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [txHash, setTxHash] = useState(null);

  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient({ chainId: monadTestnet.id });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!accusedName.trim()) return;

    if (!isConnected || !walletClient || !mysteryId || !salt) {
      alert("Wallet not connected or mystery not initialized");
      return;
    }

    setSubmitting(true);
    
    try {
      // Find the actual murderer for local verification
      const murderer = caseData.suspects.find(suspect => suspect.is_murderer);
      setMurdererName(murderer ? murderer.name : "Unknown");

      // Call solveMystery on DeadDropRegistry smart contract
      console.log("🔐 Calling solveMystery on-chain...", {
        mysteryId,
        culprit: accusedName,
        salt
      });

      const hash = await walletClient.writeContract({
        address: DEAD_DROP_REGISTRY_ADDRESS,
        abi: DEAD_DROP_REGISTRY_ABI,
        functionName: 'solveMystery',
        args: [BigInt(mysteryId), accusedName, salt]
      });

      console.log("📤 Transaction sent:", hash);
      setTxHash(hash);

      // Wait for transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      console.log("✅ Transaction confirmed:", receipt);

      // Check if the mystery was solved successfully
      // If transaction succeeded, the guess was correct
      const isMatch = receipt.status === 'success';

      setIsCorrect(isMatch);
      setShowResult(true);

      // If the accusation was correct, notify the parent component
      if (isMatch && onSuccessfulSolve) {
        onSuccessfulSolve();
      }

    } catch (error) {
      console.error("❌ Error solving mystery:", error);

      // If the transaction reverted, it means the guess was incorrect
      if (error.message?.includes("Incorrect solution")) {
        setIsCorrect(false);
        setShowResult(true);
      } else {
        alert("Failed to submit solution. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextGame = () => {
    setAccusedName("");
    setShowResult(false);
    setIsCorrect(false);
    setTxHash(null);
    if (onResetGame) {
      onResetGame();
    }
  };

  if (showResult) {
    return (
      <div className={`relative overflow-hidden rounded-lg p-6 text-center border transition-all duration-500 ${
      isCorrect 
          ? "bg-green-900/20 border-green-500/50 shadow-[0_0_30px_-10px_rgba(34,197,94,0.3)]" 
          : "bg-red-900/20 border-red-500/50 shadow-[0_0_30px_-10px_rgba(239,68,68,0.3)]"
      }`}>
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent" />
        
        {isCorrect ? (
          <div className="relative z-10 animate-in zoom-in duration-300">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500">
              <CheckCircle2 className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-black text-green-400 uppercase tracking-widest mb-2">Mystery Solved</h2>
            <p className="text-slate-300 mb-4 text-sm">
              Excellent deduction, Detective. <br/>
              <span className="text-green-300 font-bold">{murdererName}</span> has been apprehended.
            </p>
            {txHash && (
              <p className="text-xs text-slate-500 mb-4 font-mono break-all">
                Tx: {txHash.slice(0, 10)}...{txHash.slice(-8)}
              </p>
            )}
          </div>
        ) : (
          <div className="relative z-10 animate-in shake duration-300">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="text-2xl font-black text-red-400 uppercase tracking-widest mb-2">Wrong Guess</h2>
            <p className="text-slate-300 mb-6 text-sm">
              Your deduction was incorrect. <br/>
              The true culprit was <span className="text-red-300 font-bold">{murdererName}</span>.
            </p>
          </div>
        )}
        
        <button
          onClick={handleNextGame}
          className={`px-6 py-2 rounded font-bold text-sm uppercase tracking-wide transition-all flex items-center justify-center gap-2 mx-auto ${
            isCorrect 
             ? "bg-green-600 hover:bg-green-500 text-white shadow-lg hover:shadow-green-500/25" 
             : "bg-slate-700 hover:bg-slate-600 text-white hover:text-red-200"
          }`}
        >
          {isCorrect ? (
            <>Next Mystery <ArrowRight className="w-4 h-4" /></>
          ) : (
            <>New Mystery <RotateCcw className="w-4 h-4" /></>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/50 p-4 rounded-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Fingerprint className="h-5 w-5 text-slate-500" />
            </div>
            <input
              type="text"
              id="accusedName"
              placeholder="Enter suspect name..."
              className="w-full pl-10 pr-4 py-3 bg-slate-950 border border-slate-700 rounded text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono text-sm"
              value={accusedName}
              onChange={(e) => setAccusedName(e.target.value)}
              required
              autoComplete="off"
              disabled={submitting}
            />
        </div>
        
        <button
          type="submit"
          disabled={submitting || !isConnected}
          className="w-full py-3 bg-purple-700 hover:bg-purple-600 disabled:bg-slate-700 disabled:cursor-not-allowed rounded text-white font-bold text-xs uppercase tracking-widest shadow-lg hover:shadow-purple-500/20 transition-all flex items-center justify-center gap-2 border border-purple-500/20"
        >
          {submitting ? (
             <>
               <Loader2 className="w-4 h-4 animate-spin" />
               <span>Verifying On-Chain...</span>
             </>
          ) : !isConnected ? (
             <span>Connect Wallet First</span>
          ) : (
             <>
                <Gavel className="w-4 h-4" /> Submit Accusation
             </>
          )}
        </button>
      </form>
    </div>
  );
};
    
export default Accusation;