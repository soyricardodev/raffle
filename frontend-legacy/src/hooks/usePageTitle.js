import { useEffect } from 'react';

/**
 * @param {string} title 
 * @param {string} defaultTitle 
 */
const usePageTitle = (title, defaultTitle = 'Rifas') => {
  useEffect(() => {
    const previousTitle = document.title;

    if (title) {
      document.title = title;
    } else if (defaultTitle) {
      document.title = defaultTitle;
    }


    return () => {

    };
  }, [title, defaultTitle]);
};

export default usePageTitle;