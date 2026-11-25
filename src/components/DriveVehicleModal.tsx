import React, { useEffect } from 'react';
import { Bike, Car, Navigation, X } from 'lucide-react';
import type { DriveVehicleMode } from '../types/parking';

interface DriveVehicleModalProps {
  isOpen: boolean;
  onSelectVehicle: (vehicle: DriveVehicleMode) => void;
  onClose: () => void;
}

export const DriveVehicleModal: React.FC<DriveVehicleModalProps> = ({
  isOpen,
  onSelectVehicle,
  onClose,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-end sm:items-center justify-center bg-[#141517]/50 backdrop-blur-xs p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="drive-vehicle-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-[420px] bg-white rounded-t-[28px] sm:rounded-[28px] shadow-[0_24px_64px_rgba(20,21,23,0.22)] overflow-hidden pb-[env(safe-area-inset-bottom)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden pt-3 flex justify-center">
          <span className="w-10 h-1.5 rounded-full bg-[#D8DCE2]" aria-hidden="true" />
        </div>

        <div className="px-5 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-[#F0F1F3]">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-full bg-[#C5EC45] text-[#141517] flex items-center justify-center shrink-0">
              <Navigation className="w-4 h-4" />
            </span>
            <h2
              id="drive-vehicle-modal-title"
              className="text-[17px] font-bold text-[#141517] truncate"
            >
              Choose Your Vehicle
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close vehicle selection"
            className="w-11 h-11 rounded-full bg-[#F4F5F6] hover:bg-[#E8EAED] text-[#141517] flex items-center justify-center shrink-0 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-[13px] text-[#525760] leading-relaxed">
            Are you on a <strong>moto bike</strong> or driving a <strong>car</strong>? We will remember your selection so next time you can navigate with one tap.
          </p>

          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => onSelectVehicle('motorcycle')}
              className="min-h-[112px] p-4 rounded-[22px] bg-[#F6F7F8] hover:bg-[#F3FCE0] border-2 border-transparent hover:border-[#C5EC45] active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517]"
            >
              <span className="w-11 h-11 rounded-full bg-white shadow-2xs flex items-center justify-center text-[#141517]">
                <Bike className="w-6 h-6" />
              </span>
              <div>
                <p className="text-[14.5px] font-bold text-[#141517]">Moto Bike</p>
                <p className="text-[11.5px] text-[#767B84]">Includes moto-only lots</p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectVehicle('car')}
              className="min-h-[112px] p-4 rounded-[22px] bg-[#F6F7F8] hover:bg-[#F3FCE0] border-2 border-transparent hover:border-[#C5EC45] active:scale-[0.98] transition-all flex flex-col items-center justify-center gap-2 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#141517]"
            >
              <span className="w-11 h-11 rounded-full bg-white shadow-2xs flex items-center justify-center text-[#141517]">
                <Car className="w-6 h-6" />
              </span>
              <div>
                <p className="text-[14.5px] font-bold text-[#141517]">Car</p>
                <p className="text-[11.5px] text-[#767B84]">Garages, malls & EV</p>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
