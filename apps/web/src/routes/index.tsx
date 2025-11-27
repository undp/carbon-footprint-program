import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

interface Post {
  userId: number;
  id: number;
  title: string;
  body: string;
}

function RouteComponent() {
  const { data, isLoading, isError } = useQuery<Post>({
    queryKey: ["test"],
    queryFn: async () => {
      const response = await fetch(
        "https://jsonplaceholder.typicode.com/posts/1"
      );
      const data: Post = (await response.json()) as Post;
      return data;
    },
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Prueba de React Query</h1>
      {isLoading && <p className="text-blue-500">Cargando...</p>}
      {isError && <p className="text-red-500">Error al cargar datos</p>}
      {data && (
        <div className="mt-4 p-4 bg-green-100 rounded">
          <p className="text-green-800 font-semibold">
            ✅ React Query funciona!
          </p>
          <p className="mt-2 text-sm">Título: {data.title}</p>
        </div>
      )}
    </div>
  );
}
