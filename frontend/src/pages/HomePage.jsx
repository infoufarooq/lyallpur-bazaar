import React from 'react';
import HeroBanner from '../components/home/HeroBanner';
import CategoryGrid from '../components/home/CategoryGrid';
import FlashDeals from '../components/home/FlashDeals';
import PopularGrid from '../components/home/PopularGrid';
import RecommendedGrid from '../components/home/RecommendedGrid';
import TrustSection from '../components/home/TrustSection';

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2">
      <HeroBanner />
      <CategoryGrid />
      <FlashDeals />
      <PopularGrid />
      <RecommendedGrid />
      <TrustSection />
    </div>
  );
}
