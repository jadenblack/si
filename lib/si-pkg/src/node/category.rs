use std::io::{BufRead, Write};

use object_tree::{
    read_key_value_line, write_key_value_line, GraphError, NameStr, NodeChild, NodeKind,
    NodeWithChildren, ReadBytes, WriteBytes,
};
use serde::{Deserialize, Serialize};

use crate::SchemaSpec;

use super::PkgNode;

const CATEGORY_TY_SCHEMAS: &str = "schemas";

const KEY_KIND_STR: &str = "kind";

#[derive(Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum PackageCategory {
    Schemas(Vec<SchemaSpec>),
}

#[derive(Clone, Debug, Serialize)]
pub enum CategoryNode {
    Schemas,
}

impl CategoryNode {
    pub fn kind_str(&self) -> &'static str {
        match self {
            Self::Schemas => CATEGORY_TY_SCHEMAS,
        }
    }
}

impl NameStr for CategoryNode {
    fn name(&self) -> &str {
        match self {
            Self::Schemas => CATEGORY_TY_SCHEMAS,
        }
    }
}

impl WriteBytes for CategoryNode {
    fn write_bytes<W: Write>(&self, writer: &mut W) -> Result<(), GraphError> {
        write_key_value_line(writer, KEY_KIND_STR, self.kind_str())?;
        Ok(())
    }
}

impl ReadBytes for CategoryNode {
    fn read_bytes<R: BufRead>(reader: &mut R) -> Result<Self, GraphError>
    where
        Self: std::marker::Sized,
    {
        let kind_str = read_key_value_line(reader, KEY_KIND_STR)?;

        let node = match kind_str.as_str() {
            CATEGORY_TY_SCHEMAS => Self::Schemas,
            invalid_kind => {
                return Err(GraphError::parse_custom(format!(
                    "invalid package category node kind: {invalid_kind}"
                )))
            }
        };

        Ok(node)
    }
}

impl NodeChild for PackageCategory {
    type NodeType = PkgNode;

    fn as_node_with_children(&self) -> NodeWithChildren<Self::NodeType> {
        match self {
            Self::Schemas(entries) => {
                let mut children = Vec::new();
                for entry in entries {
                    children
                        .push(Box::new(entry.clone())
                            as Box<dyn NodeChild<NodeType = Self::NodeType>>);
                }

                NodeWithChildren::new(
                    NodeKind::Tree,
                    Self::NodeType::Category(CategoryNode::Schemas),
                    children,
                )
            }
        }
    }
}
