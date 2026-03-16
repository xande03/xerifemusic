// YouTube search suggestions via Google's public endpoint
// This works client-side without CORS issues using JSONP-style fetch

export interface SearchSuggestion {
  term: string;
}

export async function getSearchSuggestions(query: string): Promise<string[]> {
  if (!query || query.length < 2) return [];
  
  try {
    // Google's suggest endpoint with YouTube client
    const url = `https://clients1.google.com/complete/search?client=youtube&ds=yt&q=${encodeURIComponent(query)}`;
    
    // Use a CORS proxy approach - fetch as script/jsonp
    // Since direct fetch may be blocked, we use a script injection approach
    return new Promise((resolve) => {
      const callbackName = `ytSuggest_${Date.now()}`;
      
      (window as any)[callbackName] = (data: any) => {
        try {
          const suggestions = data[1]?.map((item: any) => item[0]) || [];
          resolve(suggestions.slice(0, 8));
        } catch {
          resolve([]);
        }
        delete (window as any)[callbackName];
        script.remove();
      };

      const script = document.createElement("script");
      script.src = `${url}&callback=${callbackName}`;
      script.onerror = () => {
        resolve([]);
        delete (window as any)[callbackName];
        script.remove();
      };
      document.head.appendChild(script);
      
      // Timeout after 3s
      setTimeout(() => {
        if ((window as any)[callbackName]) {
          resolve([]);
          delete (window as any)[callbackName];
          script.remove();
        }
      }, 3000);
    });
  } catch {
    return [];
  }
}
