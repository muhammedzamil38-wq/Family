import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, User, Users, Calendar, Tag, Book } from 'lucide-react';

const API_BASE_URL = process.env.VITE_API_BASE_URL || 'http://localhost:5000';

// Recursive Tree Node Component
function TreeNode({ node, level = 0 }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasChildren = node.children && node.children.length > 0;

  const handleToggle = () => {
    setIsExpanded(prev => !prev);
  };

  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleToggle();
    }
  };

  const yearsString = [node.birthYear, node.deathYear]
    .filter(y => y !== undefined && y !== null)
    .join(' – ');

  return (
    <div className="tree-node" style={{ marginLeft: level > 0 ? '24px' : '0' }}>
      {/* Connector lines visual details */}
      {level > 0 && <div className="tree-connector-horizontal"></div>}

      <div className="tree-row-wrapper">
        {/* Expanded detail card */}
        <div className={`glass-card family-member-card ${node.portraitPath ? 'has-portrait' : ''}`}>
          {node.portraitPath ? (
            <img 
              src={`${API_BASE_URL}/${node.portraitPath}`} 
              alt={node.fullName} 
              className="member-portrait" 
              loading="lazy"
            />
          ) : (
            <div className="member-portrait-fallback">
              <User size={28} />
            </div>
          )}

          <div className="member-info">
            <div className="member-header">
              <h3 className="member-name">{node.fullName}</h3>
              {node.relationshipLabel && (
                <span className="member-relationship-badge">
                  <Tag size={12} /> {node.relationshipLabel}
                </span>
              )}
            </div>

            {yearsString && (
              <p className="member-years">
                <Calendar size={14} /> {yearsString}
              </p>
            )}

            {node.bio && (
              <p className="member-bio">
                <Book size={14} /> {node.bio}
              </p>
            )}
          </div>

          {/* Expand/Collapse Chevron (min 44px hit-target) */}
          {hasChildren && (
            <button
              onClick={handleToggle}
              onKeyDown={handleKeyDown}
              className="tree-expand-btn"
              aria-expanded={isExpanded}
              aria-label={`${isExpanded ? 'Collapse' : 'Expand'} descendants of ${node.fullName}`}
              tabIndex={0}
            >
              {isExpanded ? <ChevronDown size={22} /> : <ChevronRight size={22} />}
            </button>
          )}
        </div>
      </div>

      {/* Children container with vertical connector line */}
      {hasChildren && isExpanded && (
        <div className="tree-children-container">
          <div className="tree-connector-vertical"></div>
          {node.children.map(child => (
            <TreeNode key={child._id} node={child} level={level + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Family() {
  const [treeRoots, setTreeRoots] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Fetch visible members flat array and build tree
  useEffect(() => {
    async function fetchFamily() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/v1/public/family`);
        if (res.ok) {
          const flatList = await res.json();
          const tree = assembleTree(flatList);
          setTreeRoots(tree);
        }
      } catch (err) {
        console.error('Error fetching family:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchFamily();
  }, []);

  // Converts flat MongoDB array into nested parent-child tree structure
  const assembleTree = (list) => {
    const map = {};
    const roots = [];

    // Initialize list maps with children arrays
    list.forEach(item => {
      map[item._id] = { ...item, children: [] };
    });

    // Nest nodes
    list.forEach(item => {
      const current = map[item._id];
      if (item.parentId) {
        const parent = map[item.parentId];
        if (parent) {
          parent.children.push(current);
        } else {
          // If parent is not visible/in list, treat child as root
          roots.push(current);
        }
      } else {
        roots.push(current);
      }
    });

    // Recursive sorting helper by displayOrder and fullName
    const sortSubtree = (nodes) => {
      nodes.sort((a, b) => {
        if (a.displayOrder !== b.displayOrder) {
          return (a.displayOrder || 0) - (b.displayOrder || 0);
        }
        return a.fullName.localeCompare(b.fullName);
      });
      nodes.forEach(node => {
        if (node.children.length > 0) {
          sortSubtree(node.children);
        }
      });
    };

    sortSubtree(roots);
    return roots;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Reassembling the lineage tree...</p>
      </div>
    );
  }

  return (
    <div className="family-view">
      <div className="container">
        <div className="family-header">
          <h1 className="page-title">The Family Tree</h1>
          <p className="page-subtitle">Trace our relationships, founders, and descendants across generations.</p>
        </div>

        {treeRoots.length > 0 ? (
          <div className="tree-roots-wrapper">
            {treeRoots.map(rootNode => (
              <TreeNode key={rootNode._id} node={rootNode} />
            ))}
          </div>
        ) : (
          <div className="glass-card empty-tree-state">
            <Users size={48} className="empty-state-icon" />
            <h2>No Family Records Found</h2>
            <p>Our lineage details are currently being compiled. Check back soon to view the complete history.</p>
          </div>
        )}
      </div>
    </div>
  );
}
