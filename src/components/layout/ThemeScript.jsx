export function ThemeScript() {
  const script = `(function(){try{var t=localStorage.getItem("ubintrack-theme");var d=t==="dark"||(t!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
