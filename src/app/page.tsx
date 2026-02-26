"use client";

import { useStore } from "@/lib/store";
import LoginScreen from "@/components/LoginScreen";
import FeedView from "@/components/FeedView";
import ArticleView from "@/components/ArticleView";
import SearchView from "@/components/SearchView";

export default function Home() {
  const { isConnected, activeArticle, isSpeedReading, isSearching } = useStore();

  if (!isConnected) {
    return <LoginScreen />;
  }

  if (activeArticle || isSpeedReading) {
    return <ArticleView />;
  }

  if (isSearching) {
    return <SearchView />;
  }

  return <FeedView />;
}
