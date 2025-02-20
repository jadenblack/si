use axum::Json;
use dal::{
    AttributeValue, AttributeValueError, AttributeValueId, ChangeSet, StandardModel, Visibility,
};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

use super::ComponentResult;
use crate::server::extract::{AccessBuilder, HandlerContext};

#[derive(Deserialize, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AlterSimulationRequest {
    pub attribute_values: HashMap<AttributeValueId, serde_json::Value>,
    #[serde(flatten)]
    pub visibility: Visibility,
}

#[derive(Deserialize, Serialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct AlterSimulationResponse {
    success: bool,
}

pub async fn alter_simulation(
    HandlerContext(builder): HandlerContext,
    AccessBuilder(request_ctx): AccessBuilder,
    Json(request): Json<AlterSimulationRequest>,
) -> ComponentResult<Json<AlterSimulationResponse>> {
    let mut ctx = builder.build(request_ctx.build(request.visibility)).await?;

    let mut change_set = ChangeSet::new(&ctx, "fix-simulation", None).await?;
    ctx.update_visibility(Visibility::new_change_set(change_set.pk, false));

    for (attribute_value_id, value) in request.attribute_values {
        let attribute_value = AttributeValue::get_by_id(&ctx, &attribute_value_id)
            .await?
            .ok_or(AttributeValueError::NotFound(
                attribute_value_id,
                *ctx.visibility(),
            ))?;
        let parent_attribute_value = attribute_value.parent_attribute_value(&ctx).await?;
        AttributeValue::update_for_context(
            &ctx,
            *attribute_value.id(),
            parent_attribute_value.map(|p| *p.id()),
            attribute_value.context,
            Some(value),
            None,
        )
        .await?;
    }

    // Propagates all values before applying
    ctx.blocking_commit().await?;

    change_set.apply(&mut ctx).await?;

    ctx.commit().await?;

    Ok(Json(AlterSimulationResponse { success: true }))
}
