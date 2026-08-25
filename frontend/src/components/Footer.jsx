
function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <span>© {year} Food Waste Connector</span> •
      <span>Built for responsiveness & accessibility</span>
    </footer>
  );
}

export default Footer;

