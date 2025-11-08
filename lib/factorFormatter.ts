/**
 * Format decision factors into human-readable sentences
 */

/**
 * Convert factor tags like "values:freedom" into consumable sentences
 */
export function formatFactor(factor: string): string {
  // Handle different factor formats
  if (factor.includes(':')) {
    const [category, value] = factor.split(':');
    
    switch (category.toLowerCase()) {
      case 'values':
        return `You prioritize ${value} in your decision-making.`;
      
      case 'relationship':
        const relParts = value.split('_');
        if (relParts.length >= 2) {
          const relType = relParts[0];
          const relDetails = relParts.slice(1).join(' ');
          return `Your ${relType} relationship (${relDetails}) influences this choice.`;
        }
        return `Your relationship with ${value} is a key consideration.`;
      
      case 'decision_style':
        return `Your decision style (${value.replace(/-/g, ' ')}) guides this prediction.`;
      
      case 'job_sentiment':
        return `Your feelings about your current job (${value.replace(/_/g, ' ')}) impact this decision.`;
      
      case 'career':
        return `Your career trajectory suggests ${value.replace(/_/g, ' ')}.`;
      
      case 'location':
        return `Location considerations (${value}) are influencing this choice.`;
      
      case 'financial':
        return `Financial factors (${value}) play a role in this decision.`;
      
      case 'recent_mood':
        return `Recent mood: ${value.replace(/_/g, ' ')}`;
      
      case 'stress_level':
        return `Current stress level: ${value.replace(/_/g, ' ')}`;
      
      case 'life_stage':
        return `Life stage: ${value.replace(/_/g, ' ')}`;
      
      case 'motivation':
        return `Motivation: ${value.replace(/_/g, ' ')}`;
      
      default:
        // Generic format - convert underscores to spaces and capitalize properly
        const formattedCategory = category.replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        const formattedValue = value.replace(/_/g, ' ');
        return `${formattedCategory}: ${formattedValue}`;
    }
  }
  
  // If it's already a sentence or doesn't match patterns, return as-is
  // But ensure it's capitalized and replace underscores
  if (factor.length > 0) {
    const cleaned = factor.replace(/_/g, ' ');
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1) + 
           (cleaned.endsWith('.') ? '' : '.');
  }
  
  return factor;
}

/**
 * Format an array of factors into a list of sentences
 */
export function formatFactors(factors: string[]): string[] {
  return factors.map(formatFactor);
}











