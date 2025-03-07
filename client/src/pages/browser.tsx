import InAppBrowser from "@/components/browser/in-app-browser";

export default function Browser() {
  // Get the URL from the query string
  const url = new URLSearchParams(window.location.search).get("url");
  
  if (!url) {
    return <div>No URL provided</div>;
  }

  return <InAppBrowser url={url} />;
}
