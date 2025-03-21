// Script to find all dynamic routes in the project
const fs = require('fs');
const path = require('path');

// Function to recursively search for files with dynamic routes
function findDynamicRoutes(dir, results = []) {
  const files = fs.readdirSync(dir);
  
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      // Check if directory name contains square brackets (dynamic route)
      if (file.includes('[') && file.includes(']')) {
        results.push({
          type: 'directory',
          path: filePath,
          name: file
        });
      }
      // Recursively search subdirectories
      findDynamicRoutes(filePath, results);
    } else if (stat.isFile()) {
      // Check if file name contains square brackets (dynamic route)
      if (file.includes('[') && file.includes(']')) {
        results.push({
          type: 'file',
          path: filePath,
          name: file
        });
      }
    }
  }
  
  return results;
}

// Start search from the pages directory
const dynamicRoutes = findDynamicRoutes('./pages');

// Print results
console.log('Found dynamic routes:');
dynamicRoutes.forEach(route => {
  console.log(`${route.type}: ${route.path} (${route.name})`);
});

// Group by parameter name to find conflicts
const parameterMap = {};
dynamicRoutes.forEach(route => {
  const match = route.name.match(/\[(.*?)\]/);
  if (match) {
    const paramName = match[1];
    if (!parameterMap[paramName]) {
      parameterMap[paramName] = [];
    }
    parameterMap[paramName].push(route.path);
  }
});

console.log('\nParameters used in dynamic routes:');
for (const [param, routes] of Object.entries(parameterMap)) {
  console.log(`\n[${param}] used in:`);
  routes.forEach(route => console.log(`  ${route}`));
} 