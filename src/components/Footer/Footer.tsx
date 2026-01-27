import React from 'react';
import { useTranslation } from 'react-i18next';

const Footer = () => {
  const { t } = useTranslation();

  return (
    <footer className="w-full bg-[#051a40] py-12 text-gray-300 overflow-hidden">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col items-start gap-10 border-2 border-red-600 bg-red-500/5 px-4 md:px-8 md:flex-row md:justify-between">
        {/* ... content ... */}
      </div>

      {/* Bottom */}
      <div className="mx-auto mt-12 w-full max-w-[1280px] border-2 border-red-600 bg-red-500/5 border-t border-gray-800 px-4 pt-8 text-center text-sm text-gray-500">
        <p>
          © {new Date().getFullYear()} {t('footer.copyright')}
        </p>
      </div>
    </footer>
  );
};

export default Footer;
