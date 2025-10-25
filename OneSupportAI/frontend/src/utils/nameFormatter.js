export const formatUserName = (email) => {
  if (!email) return 'User';
  
  // Get the part before the @ symbol
  const name = email.split('@')[0];
  
  // Split by dot or underscore or hyphen
  const parts = name.split(/[._-]/);
  
  // Capitalize first letter of each part and join with space
  return parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
};
