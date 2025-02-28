// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title PersonalDataRegistry
 * @dev Manages access control for personal data stored on web3 URLs (w3link.io)
 */
contract PersonalDataRegistry {
    // Data category types
    enum DataCategory { 
        PERSONAL_INFO,    // Name, age, etc.
        CONTACT_INFO,     // Email, phone, etc.
        INTERESTS,        // Hobbies, preferences
        TRAVEL_HISTORY,   // Places visited
        EDUCATION,        // Educational background
        WORK_HISTORY      // Professional experience
    }
    
    // Data record structure
    struct DataRecord {
        DataCategory category;
        string contentKey;    // Content key for the web3 URL (e.g., "Naa.modda")
        uint256 timestamp;
        bool exists;
    }
    
    // Map user address -> category -> data record
    mapping(address => mapping(DataCategory => DataRecord)) private userData;
    
    // Map user address -> category -> list of approved viewers
    mapping(address => mapping(DataCategory => mapping(address => bool))) private approvedViewers;
    
    // Track what categories a user has uploaded
    mapping(address => DataCategory[]) private userCategories;
    
    // Track categories per user to avoid duplicates
    mapping(address => mapping(DataCategory => bool)) private hasUploadedCategory;
    
    // Events
    event DataUploaded(address indexed owner, DataCategory indexed category, uint256 timestamp);
    event AccessGranted(address indexed owner, address indexed viewer, DataCategory indexed category);
    event AccessRevoked(address indexed owner, address indexed viewer, DataCategory indexed category);
    
    /**
     * @dev Upload data for a specific category
     * @param category The data category being uploaded
     * @param contentKey The content key for the web3 URL where the data is stored
     */
    function uploadData(DataCategory category, string calldata contentKey) external {
        // Check if this is first upload for this category
        if (!hasUploadedCategory[msg.sender][category]) {
            userCategories[msg.sender].push(category);
            hasUploadedCategory[msg.sender][category] = true;
        }
        
        // Save the data record
        userData[msg.sender][category] = DataRecord({
            category: category,
            contentKey: contentKey,
            timestamp: block.timestamp,
            exists: true
        });
        
        emit DataUploaded(msg.sender, category, block.timestamp);
    }
    
    /**
     * @dev Grant access to another user for a specific category
     * @param viewer The address to grant access to
     * @param category The data category to share
     */
    function grantAccess(address viewer, DataCategory category) external {
        require(userData[msg.sender][category].exists, "No data for this category");
        require(!approvedViewers[msg.sender][category][viewer], "Already approved");
        
        approvedViewers[msg.sender][category][viewer] = true;
        emit AccessGranted(msg.sender, viewer, category);
    }
    
    /**
     * @dev Revoke previously granted access
     * @param viewer The address to revoke access from
     * @param category The data category to revoke access to
     */
    function revokeAccess(address viewer, DataCategory category) external {
        require(approvedViewers[msg.sender][category][viewer], "Not approved");
        
        approvedViewers[msg.sender][category][viewer] = false;
        emit AccessRevoked(msg.sender, viewer, category);
    }
    
    /**
     * @dev Check if address has uploaded data for a category
     * @param user The user address to check
     * @param category The data category to check
     * @return bool Whether the user has uploaded this data category
     */
    function hasData(address user, DataCategory category) external view returns (bool) {
        return userData[user][category].exists;
    }
    
    /**
     * @dev Get all categories a user has uploaded
     * @param user The user address to query
     * @return Array of DataCategory enums the user has uploaded
     */
    function getUserCategories(address user) external view returns (DataCategory[] memory) {
        return userCategories[user];
    }
    
    /**
     * @dev Get content key for a specific category (only for approved viewers or owner)
     * @param owner The owner of the data
     * @param category The data category to retrieve
     * @return string The content key where the data is stored
     */
    function getContentKey(address owner, DataCategory category) external view returns (string memory) {
        require(
            msg.sender == owner || approvedViewers[owner][category][msg.sender],
            "Not authorized to view this data"
        );
        require(userData[owner][category].exists, "No data for this category");
        
        return userData[owner][category].contentKey;
    }
    
    /**
     * @dev Check if viewer is approved for a category
     * @param owner The owner of the data
     * @param viewer The address to check approval for
     * @param category The data category to check
     * @return bool Whether the viewer is approved
     */
    function isApproved(address owner, address viewer, DataCategory category) external view returns (bool) {
        return approvedViewers[owner][category][viewer];
    }
} 