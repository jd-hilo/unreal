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
      
      default:
        // Generic format
        return `${category.charAt(0).toUpperCase() + category.slice(1)}: ${value.replace(/_/g, ' ')}`;
    }
  }
  
  // If it's already a sentence or doesn't match patterns, return as-is
  // But ensure it's capitalized
  if (factor.length > 0) {
    return factor.charAt(0).toUpperCase() + factor.slice(1) + 
           (factor.endsWith('.') ? '' : '.');
  }
  
  return factor;
}

/**
 * Format an array of factors into a list of sentences
 */
export function formatFactors(factors: string[]): string[] {
  return factors.map(formatFactor);
}






