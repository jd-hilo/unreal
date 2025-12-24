import Constants from 'expo-constants';

// Perplexity API key
const perplexityApiKey = 
  Constants.expoConfig?.extra?.perplexityApiKey || 
  process.env.EXPO_PUBLIC_PERPLEXITY_API_KEY ||
  process.env.PERPLEXITY_API_KEY ||
  null;

// Debug: Log if API key is found (without exposing the key)
if (perplexityApiKey) {
  console.log('✅ Perplexity API key found:', perplexityApiKey.substring(0, 10) + '...');
} else {
  console.warn('⚠️ Perplexity API key NOT found. Check .env file and restart Expo.');
}

export interface StoryData {
  title: string;
  summary: string;
  url: string;
  publishedAt: string;
}

/**
 * Fetch 5 daily news stories using Perplexity Sonar API
 */
export async function fetchDailyStories(userLocation?: string): Promise<StoryData[]> {
  if (!perplexityApiKey) {
    throw new Error('Perplexity API key not configured');
  }

  const locationContext = userLocation 
    ? ` (considering relevance to ${userLocation}, but prioritize stories with broader national/global impact)` 
    : '';

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${perplexityApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'sonar',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful assistant that provides concise, relevant news stories. Return only the most important stories that could affect people\'s daily lives. AVOID overly dark, violent, or depressing news unless it has major global economic/political implications. Focus on technology, economy, society, health, and policy.',
          },
          {
            role: 'user',
            content: `What are the 5 most important news stories today that could affect people's lives${locationContext}? Focus on economy, tech, society, and policy with wider implications - avoid hyper-local news or purely tragic/violent events. Provide a brief summary (2-3 sentences) for each story, the source URL, and publication date. Format as a JSON array with objects containing: title, summary, url, publishedAt.`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Perplexity API error:', errorText);
      throw new Error(`Perplexity API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      console.error('Perplexity API response:', JSON.stringify(data, null, 2));
      throw new Error('No content returned from Perplexity API');
    }

    // Try to parse JSON from the response
    // The response might be wrapped in markdown code blocks
    let jsonContent = content.trim();
    
    // Log the raw content for debugging (first 200 chars)
    console.log('Raw Perplexity content (first 200 chars):', jsonContent.substring(0, 200));
    
    // Check if content looks like an error message
    if (jsonContent.startsWith('Error') || jsonContent.startsWith('Bad') || jsonContent.startsWith('Invalid')) {
      console.error('Perplexity returned error message:', jsonContent);
      throw new Error(`Perplexity API error: ${jsonContent.substring(0, 100)}`);
    }
    
    if (jsonContent.startsWith('```json')) {
      jsonContent = jsonContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    } else if (jsonContent.startsWith('```')) {
      jsonContent = jsonContent.replace(/```\n?/g, '').trim();
    }

    // Try to find JSON array in the content if it's not at the start
    if (!jsonContent.startsWith('[') && !jsonContent.startsWith('{')) {
      // Try to extract JSON from the content
      const jsonMatch = jsonContent.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        jsonContent = jsonMatch[0];
      } else {
        console.error('No JSON array found in content:', jsonContent.substring(0, 500));
        throw new Error('Invalid response format: no JSON array found');
      }
    }

    let stories;
    try {
      stories = JSON.parse(jsonContent);
    } catch (parseError: any) {
      console.error('JSON parse error. Content:', jsonContent.substring(0, 500));
      console.error('Parse error:', parseError.message);
      throw new Error(`Failed to parse JSON response: ${parseError.message}`);
    }

    // Validate and format the stories
    if (!Array.isArray(stories)) {
      console.error('Stories is not an array:', typeof stories, stories);
      throw new Error('Invalid response format: expected array');
    }

    return stories.slice(0, 5).map((story: any, index: number) => ({
      title: story.title || `Story ${index + 1}`,
      summary: story.summary || story.description || '',
      url: story.url || story.link || '',
      publishedAt: story.publishedAt || story.date || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Failed to fetch daily stories:', error);
    throw error;
  }
}

