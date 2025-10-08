export default function ServerConnectionLogger() {
  // This runs on the server side for every page load
  if (typeof window === "undefined") {
    console.log(`📊 PAGE LOAD - Using client-side global SSE manager`);
  }

  // This component doesn't render anything visible
  return null;
}
