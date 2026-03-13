import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useLocation } from 'react-router-dom';

/**
 * Component to manage SEO Meta Tags dynamically
 * Fetches data from MetaTag entity based on current path or uses props
 */
const MetaTags = ({ title, description, image, keywords, noIndex }) => {
  const location = useLocation();
  const currentPath = location.pathname;

  // Fetch SEO data for the current path
  const { data: seoData } = useQuery({
    queryKey: ['meta-tag', currentPath],
    queryFn: async () => {
      // Find exact match for the path
      const items = await base44.entities.MetaTag.filter({ page_path: currentPath });
      return items.length > 0 ? items[0] : null;
    },
    // Don't refetch too often, maybe 5 mins
    staleTime: 1000 * 60 * 5, 
    retry: false
  });

  useEffect(() => {
    // Priority: DB config > Props > Defaults
    
    const finalTitle = seoData?.title || title;
    const finalDescription = seoData?.description || description;
    const finalImage = seoData?.og_image || image;
    const finalKeywords = seoData?.keywords || keywords;
    const finalNoIndex = seoData?.no_index !== undefined ? seoData.no_index : noIndex;

    // Ensure PWA/Mobile Tags
    setMetaTag('mobile-web-app-capable', 'yes');
    setMetaTag('apple-mobile-web-app-capable', 'yes');
    setMetaTag('apple-mobile-web-app-status-bar-style', 'black-translucent');
    setMetaTag('apple-mobile-web-app-title', 'TransferOnline');
    setMetaTag('application-name', 'TransferOnline');
    setMetaTag('msapplication-TileColor', '#2563eb');
    setMetaTag('msapplication-tap-highlight', 'no');

    if (finalTitle) {
      document.title = finalTitle;
      setMetaTag('og:title', finalTitle, 'property');
      setMetaTag('twitter:title', finalTitle);
    }

    if (finalDescription) {
      setMetaTag('description', finalDescription);
      setMetaTag('og:description', finalDescription, 'property');
      setMetaTag('twitter:description', finalDescription);
    }

    if (finalImage) {
      setMetaTag('og:image', finalImage, 'property');
      setMetaTag('twitter:image', finalImage);
    }

    if (finalKeywords) {
      setMetaTag('keywords', finalKeywords);
    }

    // Handle noindex
    let robotsTag = document.querySelector('meta[name="robots"]');
    if (finalNoIndex) {
      if (!robotsTag) {
        robotsTag = document.createElement('meta');
        robotsTag.setAttribute('name', 'robots');
        document.head.appendChild(robotsTag);
      }
      robotsTag.setAttribute('content', 'noindex, nofollow');
    } else {
      // Remove noindex if it exists and we want index
      if (robotsTag && robotsTag.getAttribute('content') === 'noindex, nofollow') {
        document.head.removeChild(robotsTag);
      }
    }

  }, [seoData, title, description, image, keywords, noIndex, currentPath]);

  const setMetaTag = (name, content, attribute = 'name') => {
    let element = document.querySelector(`meta[${attribute}="${name}"]`);
    if (!element) {
      element = document.createElement('meta');
      element.setAttribute(attribute, name);
      document.head.appendChild(element);
    }
    element.setAttribute('content', content);
  };

  return null;
};

export default MetaTags;