import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@teste-final-bible/backend/convex/_generated/api";
import { useConvexAuth } from "convex/react";


export function DailyLoginTracker() {
	const { isAuthenticated } = useConvexAuth();
	const recordLogin = useMutation(api.dailyLogins.recordDailyLogin);

	useEffect(() => {
		if (isAuthenticated) {
			recordLogin({}).catch((error) => {
				console.error("Erro ao registrar login diário:", error);
			});
		}
	}, [isAuthenticated, recordLogin]);

	return null;
}






