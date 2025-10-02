/**
 * Debug Component for Transfer Cancel Button
 *
 * This component helps debug why the cancel button isn't showing up.
 * Add this to your transfer card temporarily to see the debug info.
 */

import {
  canCancelTransfer,
  getRemainingCancellationTimeString,
} from "@/lib/transfer-cancellation-utils";

interface TransferDebugInfoProps {
  transfer: any;
  currentUserType: string;
}

export default function TransferDebugInfo({
  transfer,
  currentUserType,
}: TransferDebugInfoProps) {
  const canCancel = canCancelTransfer(transfer);

  return (
    <div className="mt-2 p-2 bg-yellow-100 border border-yellow-300 rounded text-xs">
      <h4 className="font-bold text-yellow-800">🐛 Debug Info:</h4>
      <div className="space-y-1 text-yellow-700">
        <div>Status: {transfer.status}</div>
        <div>User Type: {currentUserType}</div>
        <div>
          Accepted At:{" "}
          {transfer.acceptedAt
            ? (() => {
                const date = new Date(transfer.acceptedAt);
                return isNaN(date.getTime())
                  ? "INVALID DATE"
                  : date.toLocaleString();
              })()
            : "NOT SET"}
        </div>
        <div>Assigned To: {transfer.assignedTo}</div>
        <div>Can Cancel: {canCancel ? "✅ YES" : "❌ NO"}</div>
        {transfer.acceptedAt && (
          <div>
            Remaining Time: {getRemainingCancellationTimeString(transfer)}
          </div>
        )}
        {!transfer.acceptedAt && (
          <div className="text-red-600 font-bold">
            ⚠️ ISSUE: acceptedAt field is missing!
          </div>
        )}
      </div>
    </div>
  );
}
