use anchor_lang::prelude::*;

#[event]
pub struct PoolCreationEvent {
    pub pool_address: Pubkey,
    pub base_mint: Pubkey,
    pub token_mint: Pubkey,
    pub lp_mint: Pubkey,
}