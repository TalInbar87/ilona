import { CheckSquare } from "lucide-react";
import { TodoList } from "../components/todos/TodoList";

export function TodosPage() {
  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
          <CheckSquare className="w-5 h-5 text-sky-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900">משימות</h1>
      </div>
      <div className="card p-5">
        <TodoList />
      </div>
    </div>
  );
}
