use anchor_lang::prelude::*;
#[derive(InitSpace)]
#[account]
pub struct PoolRecord {
    pub creator: Pubkey,
    pub pool_address: Pubkey,
    pub base_mint: Pubkey,
    pub token_mint: Pubkey,
    pub lp_mint: Pubkey,
}