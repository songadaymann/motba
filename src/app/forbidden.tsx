export default function ForbiddenPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-6">
      <h1 className="text-3xl font-bold tracking-tight">Forbidden</h1>
      <p className="mt-3 text-muted-foreground">
        Your signed-in email is not allowed to use the admin area.
      </p>
    </div>
  );
}
