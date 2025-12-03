/**
 * Format decision factors into human-readable sentences
 */

/**
 * Convert underscores to spaces and capitalize properly
 */
function formatValue(value: string): string {
  return value
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Convert factor tags like "values:freedom" into consumable sentences
 */
export function formatFactor(factor: string): string {
  // Handle different factor formats
  if (factor.includes(':')) {
    const [category, value] = factor.split(':');
    const formattedValue = formatValue(value);
    
    switch (category.toLowerCase()) {
      case 'values':
        return `You prioritize ${formattedValue.toLowerCase()} in your decision-making.`;
      
      case 'relationship':
        const relParts = value.split('_');
        if (relParts.length >= 2) {
          const relType = formatValue(relParts[0]);
          const relDetails = relParts.slice(1).map(p => formatValue(p)).join(' ');
          return `Your ${relType.toLowerCase()} relationship influences this choice.`;
        }
        return `Your relationship with ${formattedValue.toLowerCase()} is a key consideration.`;
      
      case 'decision_style':
        const styleValue = value.replace(/_/g, ' ').replace(/-/g, ' ');
        return `Your decision-making style leans toward ${styleValue.toLowerCase()}.`;
      
      case 'job_sentiment':
      case 'current_situation':
        const sentimentValue = formatValue(value);
        return `Your current situation shows ${sentimentValue.toLowerCase()}.`;
      
      case 'career':
        return `Your career trajectory suggests ${formattedValue.toLowerCase()}.`;
      
      case 'location':
        return `Location considerations are influencing this choice.`;
      
      case 'financial':
        return `Financial factors play a role in this decision.`;
      
      case 'recent_mood':
        return `Your recent mood reflects ${formattedValue.toLowerCase()}.`;
      
      case 'stress_level':
        return `Your current stress level is ${formattedValue.toLowerCase()}.`;
      
      case 'life_stage':
        return `Your current life stage is ${formattedValue.toLowerCase()}.`;
      
      case 'motivation':
        return `Your motivation centers around ${formattedValue.toLowerCase()}.`;
      
      default:
        // Try to create a natural sentence from the category and value
        const formattedCategory = category.replace(/_/g, ' ')
          .split(' ')
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(' ');
        
        // Create a natural sentence
        if (formattedCategory.toLowerCase().includes('situation') || formattedCategory.toLowerCase().includes('current')) {
          return `Your current situation shows ${formattedValue.toLowerCase()}.`;
        }
        return `Your ${formattedCategory.toLowerCase()} suggests ${formattedValue.toLowerCase()}.`;
    }
  }
  
  // Handle factors that might already be sentences but have underscores
  if (factor.length > 0) {
    // Check if it looks like "Current Situation: something" format
    if (factor.toLowerCase().includes('current situation') || factor.toLowerCase().includes('situation:')) {
      const parts = factor.split(':');
      if (parts.length > 1) {
        const situationValue = formatValue(parts[1].trim());
        return `Your current situation shows ${situationValue.toLowerCase()}.`;
      }
    }
    
    // Check if it's already a proper sentence
    if (factor.includes('.') && factor.length > 20) {
      // Likely already a sentence, just clean up underscores
      return factor.replace(/_/g, ' ');
    }
    
    // Clean up and format
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











