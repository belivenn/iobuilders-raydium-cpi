import * as anchor from "@coral-xyz/anchor";
import { BN, Program } from "@coral-xyz/anchor";
import { IobuildersRaydiumCpi } from "../target/types/iobuilders_raydium_cpi";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync, getOrCreateAssociatedTokenAccount, createSyncNativeInstruction, Account } from "@solana/spl-token";
import { Keypair, SystemProgram, Commitment, PublicKey, SetComputeUnitLimitParams, ComputeBudgetProgram } from "@solana/web3.js";
const commitment: Commitment = "confirmed";
import { expect } from "chai";
describe("iobuilders-raydium-cpi", () => {


  // Helper function to log a message  
  const log = async (signature: string): Promise<string> => {
    console.log(
      `Your transaction signature: https://explorer.solana.com/transaction/${signature}?cluster=custom&customUrl=${connection.rpcEndpoint}\n`
    );
    return signature;
  };

  const confirmTx = async (signature: string) => {
    const latestBlockhash = await anchor.getProvider().connection.getLatestBlockhash();
    await anchor.getProvider().connection.confirmTransaction(
      {
        signature,
        ...latestBlockhash,
      },
      commitment
    )
  }

  const confirmTxs = async (signatures: string[]) => {
    await Promise.all(signatures.map(confirmTx))
  }

  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const connection = provider.connection;
  const program = anchor.workspace.IobuildersRaydiumCpi as Program<IobuildersRaydiumCpi>;

  // Helper function to log the transaction signature
  const confirm = async (signature: string): Promise<string> => {
    const block = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      signature,
      ...block,
    });
    await log(signature);
    return signature;
  };

  // Address of the Raydium Cpmm program on devnet
  const CPMM_PROGRAM_ID = new anchor.web3.PublicKey(
    "CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C"
  );
  // Address of the Raydium AMM configuration account on mainnet
  const AMM_CONFIG_ID = new anchor.web3.PublicKey(
    "D4FPEruKEHrG5TenZ2mpDGEfu1iUvTiqBxvpU8HLBvC2"
  );

  // Address of the Rent program
  const RENT_PROGRAM = anchor.web3.SYSVAR_RENT_PUBKEY;

  // Create pool fee receiver
  // Mainnet DNXgeM9EiiaAbaWvwjHj9fQQLAX5ZsfHyvmYUNRAdNC8
  // Devnet G11FKBRaAkHAKuLCgLM6K6NUc9rTjPAznRCjZifrTQe2
  const create_pool_fee = new anchor.web3.PublicKey(
    "DNXgeM9EiiaAbaWvwjHj9fQQLAX5ZsfHyvmYUNRAdNC8"
  );

  const WSOL_ID = new anchor.web3.PublicKey(
    "So11111111111111111111111111111111111111112"
  );
  // Define keypairs for different roles
  const [creator, token_mint, fee_nft_mint] =
    [new Keypair(), new Keypair(), new Keypair()];

  // This variable is the base vault account.
  let creator_base_ata: PublicKey;

  // This variable is the token vault account.
  let creator_token_ata: PublicKey;

  // Raydium Observation State PDA
  let observation_state: PublicKey;

  // Raydium Pool PDA
  let pool_state: PublicKey;

  // Raydium Pool vault and lp mint authority PDA
  let authority: PublicKey;

  // Raydium base mint vault & token mint vault
  let token_vault_0: PublicKey;
  let token_vault_1: PublicKey;

  // Raydium lp_mint
  let lp_mint: PublicKey;

  // lp mint ata
  let lp_mint_ata: PublicKey;

  it("Airdrop\n", async () => {
    await Promise.all([creator].map(async (k) => {
      return await anchor.getProvider().connection.requestAirdrop(k.publicKey, 100 * anchor.web3.LAMPORTS_PER_SOL)
    })).then(confirmTxs);

    // PDA address for the pool_state
    pool_state = PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool"),
        AMM_CONFIG_ID.toBuffer(),
        WSOL_ID.toBuffer(),
        token_mint.publicKey.toBuffer()
      ],
      CPMM_PROGRAM_ID
    )[0];

    observation_state = PublicKey.findProgramAddressSync(
      [
        Buffer.from("observation"),
        pool_state.toBuffer(),
      ],
      CPMM_PROGRAM_ID
    )[0];

    // PDA address for the token vault for token0 (WSOL)
    token_vault_0 = PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool_vault"),
        pool_state.toBuffer(),
        WSOL_ID.toBuffer(),
      ],
      CPMM_PROGRAM_ID
    )[0];

    // PDA address for the token vault for token1 (mint)
    token_vault_1 = PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool_vault"),
        pool_state.toBuffer(),
        token_mint.publicKey.toBuffer(),
      ],
      CPMM_PROGRAM_ID
    )[0];

    // Pda address for the Raydium vault lp auth
    authority = PublicKey.findProgramAddressSync(
      [
        Buffer.from("vault_and_lp_mint_auth_seed"),
      ],
      CPMM_PROGRAM_ID
    )[0];

    lp_mint = PublicKey.findProgramAddressSync(
      [
        Buffer.from("pool_lp_mint"),
        pool_state.toBuffer()
      ],
      CPMM_PROGRAM_ID
    )[0];

    creator_base_ata = (await getOrCreateAssociatedTokenAccount(
      connection,
      creator,
      WSOL_ID,
      creator.publicKey
    )).address;

    // Amount of SOL to wrap (2 SOL in lamports)
    const amountToWrap = 2 * anchor.web3.LAMPORTS_PER_SOL;

    // Send transaction to wrap SOL
    const wrapTx = new anchor.web3.Transaction().add(
      anchor.web3.SystemProgram.transfer({
        fromPubkey: creator.publicKey, // Sender (creator)
        toPubkey: creator_base_ata, // Associated token account for WSOL
        lamports: amountToWrap, // Amount to transfer (2 SOL)
      }),
      createSyncNativeInstruction(creator_base_ata) // Sync native balance with token balance
    );
    // Sign and send the transaction
    await anchor.web3.sendAndConfirmTransaction(connection, wrapTx, [creator]);

    console.log("Wrapped 2 SOL into WSOL at:", creator_base_ata.toBase58());

    creator_token_ata = getAssociatedTokenAddressSync(token_mint.publicKey, creator.publicKey);

    lp_mint_ata = getAssociatedTokenAddressSync(lp_mint, creator.publicKey);

  });

  // Test to create a raydium cpmm pool
  it("Creates a Raydium cpmm pool", async () => {
    let captured: any = null;

    const eventReceived = new Promise<void>((resolve) => {
      const listener = program.addEventListener("poolCreationEvent", (event, slot) => {
        captured = { event, slot };
        program.removeEventListener(listener);
        resolve();
      });
    });

    const createCpmmPoolTx = await program.methods
      .createCpmmPool(
        null
      )
      .accountsPartial({
        cpSwapProgram: CPMM_PROGRAM_ID,
        creator: creator.publicKey,
        ammConfig: AMM_CONFIG_ID,
        authority: authority,
        poolState: pool_state,
        baseMint: WSOL_ID,
        tokenMint: token_mint.publicKey,
        lpMint: lp_mint,
        creatorBaseAta: creator_base_ata,
        creatorTokenAta: creator_token_ata,
        creatorLpToken: lp_mint_ata,
        token0Vault: token_vault_0,
        token1Vault: token_vault_1,
        createPoolFee: create_pool_fee,
        observationState: observation_state,
        tokenProgram: TOKEN_PROGRAM_ID,
        token1Program: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        rent: RENT_PROGRAM

      })
      .signers([creator, token_mint])
      .instruction();

    const setComputeUnitLimitIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 250000 } as SetComputeUnitLimitParams);
    // fetching the latest blockhash
    let blockhash = await connection
      .getLatestBlockhash()
      .then(res => res.blockhash);

    // creating a versioned message instead of leagacy
    const messageV0 = new anchor.web3.TransactionMessage({
      payerKey: creator.publicKey,
      recentBlockhash: blockhash,
      instructions: [setComputeUnitLimitIx, createCpmmPoolTx]
    }).compileToV0Message()

    const transaction = new anchor.web3.VersionedTransaction(messageV0);

    transaction.sign([creator, token_mint]);
    // Step 3: Send and confirm the transaction with rpc skip preflight
    const sig = await
      anchor.getProvider()
        .connection
        // since we have already signed the tx, no need to pass the signers array again
        .sendTransaction(
          transaction,
          {
            skipPreflight: true,
          }
        )
    // Confirm txn
    await confirm(sig);

    await eventReceived;

    console.log("Event slot:", captured.slot);
    console.log("Pool creation event:", captured.event);

    expect(captured.event.creator.equals(creator.publicKey)).to.be.true;
    expect(captured.event.poolAddress.equals(pool_state)).to.be.true;
    expect(captured.event.baseMint.equals(WSOL_ID)).to.be.true;
    expect(captured.event.tokenMint.equals(token_mint.publicKey)).to.be.true;
    expect(captured.event.lpMint.equals(lp_mint)).to.be.true;

  });

});
