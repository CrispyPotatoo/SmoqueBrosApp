import React, { createContext, useCallback, useContext, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export type DialogOptions = {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
  destructive?: boolean;
};

interface AppDialogContextValue {
  showDialog: (options: DialogOptions) => void;
}

const AppDialogContext = createContext<AppDialogContextValue | undefined>(undefined);

export const useAppDialog = (): AppDialogContextValue => {
  const context = useContext(AppDialogContext);
  if (!context) {
    throw new Error('useAppDialog must be used within an AppDialogProvider');
  }
  return context;
};

export const AppDialogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = useState(false);
  const [dialogOptions, setDialogOptions] = useState<DialogOptions | null>(null);

  const showDialog = useCallback((options: DialogOptions) => {
    setDialogOptions({
      confirmText: 'OK',
      ...options,
    });
    setVisible(true);
  }, []);

  const handleClose = () => {
    setVisible(false);
    setDialogOptions(null);
  };

  const handleConfirm = () => {
    const callback = dialogOptions?.onConfirm;
    handleClose();
    if (callback) {
      callback();
    }
  };

  const handleCancel = () => {
    const callback = dialogOptions?.onCancel;
    handleClose();
    if (callback) {
      callback();
    }
  };

  const confirmText = dialogOptions?.confirmText ?? 'OK';
  const cancelText = dialogOptions?.cancelText;
  const isDestructive = dialogOptions?.destructive ?? false;

  return (
    <AppDialogContext.Provider value={{ showDialog }}>
      {children}
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {dialogOptions?.title ? (
              <Text style={styles.modalTitle}>{dialogOptions.title}</Text>
            ) : null}
            {dialogOptions?.message ? (
              <Text style={styles.modalMessage}>{dialogOptions.message}</Text>
            ) : null}
            <View style={styles.modalButtons}>
              {cancelText ? (
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonSecondary]}
                  onPress={handleCancel}
                >
                  <Text style={[styles.modalButtonText, styles.modalButtonSecondaryText]}>
                    {cancelText}
                  </Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  isDestructive ? styles.modalButtonDestructive : styles.modalButtonPrimary,
                ]}
                onPress={handleConfirm}
              >
                <Text
                  style={[
                    styles.modalButtonText,
                    isDestructive ? styles.modalButtonDestructiveText : styles.modalButtonPrimaryText,
                  ]}
                >
                  {confirmText}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </AppDialogContext.Provider>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContainer: {
    width: '100%',
    borderRadius: 16,
    backgroundColor: '#fff',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 8,
  },
  modalMessage: {
    fontSize: 14,
    color: '#4b5563',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalButton: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    minWidth: 90,
    alignItems: 'center',
    marginLeft: 12,
  },
  modalButtonSecondary: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  modalButtonPrimary: {
    backgroundColor: '#000',
  },
  modalButtonDestructive: {
    backgroundColor: '#d9534f',
  },
  modalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalButtonSecondaryText: {
    color: '#374151',
  },
  modalButtonPrimaryText: {
    color: '#fff',
  },
  modalButtonDestructiveText: {
    color: '#fff',
  },
});
