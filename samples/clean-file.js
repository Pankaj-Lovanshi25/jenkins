function formatBuildStatus(branchName) {
  if (!branchName) {
    return "Branch name is required.";
  }

  return `Build completed successfully for ${branchName}.`;
}

module.exports = {
  formatBuildStatus
};
