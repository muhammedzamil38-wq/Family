import React from 'react';
import * as Icons from 'lucide-react';

/**
 * Dynamically renders a Lucide icon based on its string name.
 * Falls back to the HelpCircle icon if the specified name is invalid.
 */
export default function DynamicIcon({ name, size = 24, className = '', ...props }) {
  const IconComponent = Icons[name];
  
  if (!IconComponent) {
    // Graceful fallback to HelpCircle icon if not found
    const Fallback = Icons.HelpCircle;
    return <Fallback size={size} className={className} {...props} />;
  }

  return <IconComponent size={size} className={className} {...props} />;
}
