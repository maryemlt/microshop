export async function GET() {
  return Response.json({
    message: "Endpoint ajoute pour verifier le drift",
    version: 2
  });
}
