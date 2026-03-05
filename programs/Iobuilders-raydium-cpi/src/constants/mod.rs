use anchor_lang::prelude::*;
use anchor_spl::associated_token::spl_associated_token_account::solana_program::native_token::LAMPORTS_PER_SOL;

pub const FUNDING_AMOUNT: u64 = LAMPORTS_PER_SOL;
pub const WSOL_ID: Pubkey = pubkey!("So11111111111111111111111111111111111111112");
pub const DEFAULT_DECIMALS: u8 = 6;
pub const DEFAULT_SUPPLY: u64 = 1_000_000_000_000_000;
pub const MAX_FUNDING_AMOUNT: u64 = 1000 * LAMPORTS_PER_SOL;
pub const POOL_RECORD_SEED: &[u8] = b"pool_record";
