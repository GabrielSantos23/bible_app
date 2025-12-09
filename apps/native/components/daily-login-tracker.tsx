import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@teste-final-bible/backend/convex/_generated/api";
import { useConvexAuth } from "convex/react";

/**
 * Componente que detecta quando o usuário entra no app e registra o login diário
 * Deve ser usado no layout principal ou em uma página autenticada
 */
export function DailyLoginTracker() {
	const { isAuthenticated } = useConvexAuth();
	const recordLogin = useMutation(api.dailyLogins.recordDailyLogin);

	useEffect(() => {
		if (isAuthenticated) {
			// Registra o login quando o componente é montado e o usuário está autenticado
			recordLogin({}).catch((error) => {
				console.error("Erro ao registrar login diário:", error);
			});
		}
	}, [isAuthenticated, recordLogin]);

	// Este componente não renderiza nada
	return null;
}






