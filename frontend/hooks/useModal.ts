// hooks/useModal.ts
import { useState, useCallback } from 'react';
import { ModalButton } from '@/components/Modal';

interface ModalConfig {
	visible: boolean;
	title?: string;
	message?: string;
	buttons?: ModalButton[];
	closeOnBackdrop?: boolean;
	showCloseButton?: boolean;
}

export const useModal = () => {
	const [modalConfig, setModalConfig] = useState<ModalConfig>({
		visible: false,
		title: '',
		message: '',
		buttons: [],
		closeOnBackdrop: true,
		showCloseButton: false,
	});

	const showModal = useCallback(
		(
			title?: string,
			message?: string,
			buttons?: ModalButton[],
			options?: {
				closeOnBackdrop?: boolean;
				showCloseButton?: boolean;
			}
		) => {
			setModalConfig({
				visible: true,
				title,
				message,
				buttons: buttons || [],
				closeOnBackdrop:
					options?.closeOnBackdrop !== undefined
						? options.closeOnBackdrop
						: true,
				showCloseButton: options?.showCloseButton || false,
			});
		},
		[]
	);

	const hideModal = useCallback(() => {
		setModalConfig((prev) => ({ ...prev, visible: false }));
	}, []);

	const updateModal = useCallback((updates: Partial<ModalConfig>) => {
		setModalConfig((prev) => ({ ...prev, ...updates }));
	}, []);

	// Preset modal types for common use cases
	const showAlert = useCallback(
		(title: string, message: string, onOk?: () => void) => {
			showModal(title, message, [
				{ text: 'OK', style: 'primary', onPress: onOk },
			]);
		},
		[showModal]
	);

	const showConfirm = useCallback(
		(
			title: string,
			message: string,
			onConfirm: () => void,
			onCancel?: () => void,
			options?: {
				confirmText?: string;
				cancelText?: string;
				confirmStyle?: 'primary' | 'danger';
			}
		) => {
			showModal(title, message, [
				{
					text: options?.cancelText || 'Cancel',
					style: 'secondary',
					onPress: onCancel,
				},
				{
					text: options?.confirmText || 'Confirm',
					style: options?.confirmStyle || 'primary',
					onPress: onConfirm,
				},
			]);
		},
		[showModal]
	);

	const showError = useCallback(
		(title: string, message: string, onRetry?: () => void) => {
			const buttons: ModalButton[] = onRetry
				? [
						{ text: 'Cancel', style: 'secondary' },
						{ text: 'Retry', style: 'primary', onPress: onRetry },
				  ]
				: [{ text: 'OK', style: 'primary' }];

			showModal(title, message, buttons);
		},
		[showModal]
	);

	const showSuccess = useCallback(
		(title: string, message: string, onContinue?: () => void) => {
			showModal(title, message, [
				{ text: 'Continue', style: 'primary', onPress: onContinue },
			]);
		},
		[showModal]
	);

	const showLoading = useCallback((message?: string) => {
		setModalConfig({
			visible: true,
			title: '',
			message: message || 'Loading...',
			buttons: [],
			closeOnBackdrop: false,
			showCloseButton: false,
		});
	}, []);

	return {
		modalConfig,
		showModal,
		hideModal,
		updateModal,
		// Preset modal types
		showAlert,
		showConfirm,
		showError,
		showSuccess,
		showLoading,
	};
};
