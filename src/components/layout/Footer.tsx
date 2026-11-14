import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="page-footer">
      <span>
        <span className="footer-pulse" />
        Awilix science core · Local runtime
      </span>
      <span>NASA / JPL reference geometry · Catalog snapshot 2025.03</span>
      <span>Build 0.9.7</span>
    </footer>
  );
};

export default Footer;
