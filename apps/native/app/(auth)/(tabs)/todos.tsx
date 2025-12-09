import { useState } from "react";
import {
	View,
	Text,
	TextInput,
	ScrollView,
	ActivityIndicator,
	Alert,
	Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQuery } from "convex/react";
import { api } from "@teste-final-bible/backend/convex/_generated/api";
import type { Id } from "@teste-final-bible/backend/convex/_generated/dataModel";
import { Container } from "@/components/container";
import { Card, Checkbox, useThemeColor, Chip } from "heroui-native";
import { StyleSheet, Image } from 'react-native';
import { GlassContainer, GlassView } from 'expo-glass-effect';
export default function TodosScreen() {
	const [newTodoText, setNewTodoText] = useState("");
	const todos = useQuery(api.todos.getAll);
	const createTodoMutation = useMutation(api.todos.create);
	const toggleTodoMutation = useMutation(api.todos.toggle);
	const deleteTodoMutation = useMutation(api.todos.deleteTodo);

	const mutedColor = useThemeColor("muted");
	const accentColor = useThemeColor("accent");
	const dangerColor = useThemeColor("danger");
	const foregroundColor = useThemeColor("foreground");

	const handleAddTodo = async () => {
		const text = newTodoText.trim();
		if (!text) return;
		await createTodoMutation({ text });
		setNewTodoText("");
	};

	const handleToggleTodo = (id: Id<"todos">, currentCompleted: boolean) => {
		toggleTodoMutation({ id, completed: !currentCompleted });
	};

	const handleDeleteTodo = (id: Id<"todos">) => {
		Alert.alert("Delete Todo", "Are you sure you want to delete this todo?", [
			{ text: "Cancel", style: "cancel" },
			{
				text: "Delete",
				style: "destructive",
				onPress: () => deleteTodoMutation({ id }),
			},
		]);
	};

	const isLoading = !todos;
	const completedCount = todos?.filter((t) => t.completed).length || 0;
	const totalCount = todos?.length || 0;

	return (
		// <Container>
		// 	<ScrollView className="flex-1" contentContainerClassName="p-6">
		// 		<View className="mb-6">
		// 			<View className="flex-row items-center justify-between mb-2">
		// 				<Text className="text-3xl font-bold text-foreground">
		// 					Todo List
		// 				</Text>
		// 				{totalCount > 0 && (
		// 					<Chip variant="secondary" color="accent" size="sm">
		// 						<Chip.Label>
		// 							{completedCount}/{totalCount}
		// 						</Chip.Label>
		// 					</Chip>
		// 				)}
		// 			</View>
		// 		</View>

		// 		<Card variant="secondary" className="mb-6 p-4">
		// 			<View className="flex-row items-center gap-3">
		// 				<View className="flex-1">
		// 					<TextInput
		// 						value={newTodoText}
		// 						onChangeText={setNewTodoText}
		// 						placeholder="Add a new task..."
		// 						placeholderTextColor={mutedColor}
		// 						onSubmitEditing={handleAddTodo}
		// 						returnKeyType="done"
		// 						className="text-foreground text-base py-3 px-4 border border-divider rounded-lg bg-surface"
		// 					/>
		// 				</View>
		// 				<Pressable
		// 					onPress={handleAddTodo}
		// 					disabled={!newTodoText.trim()}
		// 					className={`p-3 rounded-lg active:opacity-70 ${newTodoText.trim() ? "bg-accent" : "bg-surface"}`}
		// 				>
		// 					<Ionicons
		// 						name="add"
		// 						size={24}
		// 						color={newTodoText.trim() ? foregroundColor : mutedColor}
		// 					/>
		// 				</Pressable>
		// 			</View>
		// 		</Card>

		// 		{isLoading && (
		// 			<View className="items-center justify-center py-12">
		// 				<ActivityIndicator size="large" color={accentColor} />
		// 				<Text className="text-muted mt-4">Loading todos...</Text>
		// 			</View>
		// 		)}

		// 		{todos && todos.length === 0 && !isLoading && (
		// 			<Card className="items-center justify-center py-12">
		// 				<Ionicons
		// 					name="checkbox-outline"
		// 					size={64}
		// 					color={mutedColor}
		// 					style={{ marginBottom: 16 }}
		// 				/>
		// 				<Text className="text-foreground text-lg font-semibold mb-2">
		// 					No todos yet
		// 				</Text>
		// 				<Text className="text-muted text-center">
		// 					Add your first task to get started!
		// 				</Text>
		// 			</Card>
		// 		)}

		// 		{todos && todos.length > 0 && (
		// 			<View className="gap-3">
		// 				{todos.map((todo) => (
		// 					<Card key={todo._id} variant="secondary" className="p-4">
		// 						<View className="flex-row items-center gap-3">
		// 							<Checkbox
		// 								isSelected={todo.completed}
		// 								onSelectedChange={() =>
		// 									handleToggleTodo(todo._id, todo.completed)
		// 								}
		// 							/>
		// 							<View className="flex-1">
		// 								<Text
		// 									className={`text-base ${todo.completed ? "text-muted line-through" : "text-foreground"}`}
		// 								>
		// 									{todo.text}
		// 								</Text>
		// 							</View>
		// 							<Pressable
		// 								onPress={() => handleDeleteTodo(todo._id)}
		// 								className="p-2 rounded-lg active:opacity-70"
		// 							>
		// 								<Ionicons
		// 									name="trash-outline"
		// 									size={24}
		// 									color={dangerColor}
		// 								/>
		// 							</Pressable>
		// 						</View>
		// 					</Card>
		// 				))}
		// 			</View>
		// 		)}
		// 	</ScrollView>
		// </Container>
		<View style={styles.container}>
      <Image
        style={styles.backgroundImage}
        source={{
          uri: 'https://images.unsplash.com/photo-1547036967-23d11aacaee0?w=400&h=600&fit=crop',
        }}
      />
      <GlassContainer spacing={10} style={styles.containerStyle}>
        <GlassView style={styles.glass1} isInteractive />
        <GlassView style={styles.glass2} />
        <GlassView style={styles.glass3} />
      </GlassContainer>
    </View>
	);
}


const styles = StyleSheet.create({
	container: {
	  flex: 1,
	},
	backgroundImage: {
	  ...StyleSheet.absoluteFillObject,
	  width: '100%',
	  height: '100%',
	},
	containerStyle: {
	  position: 'absolute',
	  top: 200,
	  left: 50,
	  width: 250,
	  height: 100,
	  flexDirection: 'row',
	  alignItems: 'center',
	  gap: 5,
	},
	glass1: {
	  width: 60,
	  height: 60,
	  borderRadius: 30,
	},
	glass2: {
	  width: 50,
	  height: 50,
	  borderRadius: 25,
	},
	glass3: {
	  width: 40,
	  height: 40,
	  borderRadius: 20,
	},
  });