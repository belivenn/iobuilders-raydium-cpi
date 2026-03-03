use anchor_lang::prelude::*;

#[error_code]
pub enum IobuildersError {
    #[msg("The initial amount should be greater than 0")]
    InvalidFundingAmount,
    #[msg("The creator base ATA amount should be greater than the initial amount")]
    InsufficientBaseBalance,
    #[msg("The funding amount should not exceed the maximum funding amount")]
    FundingAmountExceedsMax,
}