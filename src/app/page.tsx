import ClientRedirect from "../components/home/client-redirect";

export default function Home() {
  // Render only the redirector; no UI for the root page
  return <ClientRedirect />;
}
