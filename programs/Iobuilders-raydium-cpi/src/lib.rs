use anchor_lang::prelude::*;

pub mod contexts;
pub use contexts::*;
mod constants;

declare_id!("E2q9q82wdHYhad5LBe1At3UHut81z18Z2T71rdHpAFX2");

#[program]
pub mod iobuilders_raydium_cpi {
    use super::*;

    pub fn create_cpmm_pool(
        ctx: Context<CreateCpmmPool>,
        funding_amount: Option<u64>,
    ) -> Result<()> {
        ctx.accounts.issue_tokens()?;
        ctx.accounts.revoke_mint_authority()?;
        ctx.accounts.create_cpmm_pool(funding_amount)
    }
}
