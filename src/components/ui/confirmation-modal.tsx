import { Modal } from "./modal";
import { Button } from "./button";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  type?: "confirm" | "alert" | "success" | "error";
  confirmText?: string;
  cancelText?: string;
}

export function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = "confirm",
  confirmText = "Confirm",
  cancelText = "Cancel",
}: ConfirmationModalProps) {
  const getIcon = () => {
    switch (type) {
      case "alert":
      case "confirm":
        return (
          <AlertTriangle className=" h-6 w-6 sm:w-8 sm:h-8  text-yellow-500" />
        );
      case "success":
        return (
          <CheckCircle className=" h-6 w-6 sm:w-8 sm:h-8  text-green-500" />
        );
      case "error":
        return <XCircle className=" h-6 w-6 sm:w-8 sm:h-8  text-red-500" />;
      default:
        return <Info className=" h-6 w-6 sm:w-8 sm:h-8  text-blue-500" />;
    }
  };

  const getButtonVariant = () => {
    switch (type) {
      case "success":
        return "default";
      case "error":
        return "destructive";
      default:
        return "default";
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm" title="">
      <div className="text-center space-y-4">
        <div className="flex justify-center">{getIcon()}</div>

        <div>
          <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
          <p className="text-gray-400">{message}</p>
        </div>

        <div className="flex gap-3 pt-4">
          {type === "confirm" && (
            <Button variant="outline" onClick={onClose} className="flex-1">
              {cancelText}
            </Button>
          )}
          <Button
            variant={getButtonVariant()}
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1"
          >
            {type === "confirm" ? confirmText : "OK"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
