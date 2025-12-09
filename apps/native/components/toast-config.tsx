import React, { useMemo } from 'react';
import Toast, { BaseToast, ErrorToast } from 'react-native-toast-message';
import { useThemeColor } from 'heroui-native';

export function ToastConfig() {
	const foregroundColor = useThemeColor("foreground");
	const backgroundColor = useThemeColor("card" as any);
	const successColor = useThemeColor("success");
	const dangerColor = useThemeColor("danger");
	const borderColor = useThemeColor("card" as any);

	const toastConfig = useMemo(() => ({
		success: (props: any) => (
			<BaseToast
				{...props}
				style={{
					borderLeftColor: successColor,
					borderLeftWidth: 4,
					backgroundColor: backgroundColor,
					borderColor: borderColor,
					borderWidth: 1,
				}}
				contentContainerStyle={{ paddingHorizontal: 15 }}
				text1Style={{
					fontSize: 15,
					fontWeight: '600',
					color: foregroundColor,
				}}
				text2Style={{
					fontSize: 13,
					color: foregroundColor,
					opacity: 0.8,
				}}
			/>
		),
		error: (props: any) => (
			<ErrorToast
				{...props}
				style={{
					borderLeftColor: dangerColor,
					borderLeftWidth: 4,
					backgroundColor: backgroundColor,
					borderColor: borderColor,
					borderWidth: 1,
				}}
				contentContainerStyle={{ paddingHorizontal: 15 }}
				text1Style={{
					fontSize: 15,
					fontWeight: '600',
					color: foregroundColor,
				}}
				text2Style={{
					fontSize: 13,
					color: foregroundColor,
					opacity: 0.8,
				}}
			/>
		),
	}), [foregroundColor, backgroundColor, successColor, dangerColor, borderColor]);

	return <Toast config={toastConfig} />;
}

