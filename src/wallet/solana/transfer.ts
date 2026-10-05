import { Buffer } from "buffer"
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token"
import {
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  type Transaction as SolanaTransaction,
} from "@solana/web3.js"
import { solanaConnection } from "@/lib/rpc"

const MEMO_PROGRAM_ID = new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr")

export async function transferSolana(input: {
  from: string
  to: string
  amountIn: bigint
  mint?: string | null
  memo?: string
  signTransaction: (transaction: SolanaTransaction) => Promise<SolanaTransaction>
}): Promise<string> {
  const connection = solanaConnection()
  const from = new PublicKey(input.from)
  const to = new PublicKey(input.to)
  const { blockhash } = await connection.getLatestBlockhash("confirmed")
  const mint = input.mint?.trim()
  const instructions = mint
    ? await splInstructions({ connection, from, to, mint: new PublicKey(mint), amountIn: input.amountIn })
    : [SystemProgram.transfer({ fromPubkey: from, toPubkey: to, lamports: input.amountIn })]
  if (input.memo?.trim()) instructions.push(memoInstruction(from, input.memo.trim()))

  const transaction = new Transaction()
  transaction.feePayer = from
  transaction.recentBlockhash = blockhash
  transaction.add(...instructions)
  const signed = await input.signTransaction(transaction)
  return connection.sendRawTransaction(signed.serialize(), { skipPreflight: false })
}

async function splInstructions(input: {
  connection: ReturnType<typeof solanaConnection>
  from: PublicKey
  to: PublicKey
  mint: PublicKey
  amountIn: bigint
}) {
  const mintInfo = await input.connection.getAccountInfo(input.mint)
  const programId = mintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID) ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID
  const fromToken = getAssociatedTokenAddressSync(input.mint, input.from, true, programId)
  const toToken = getAssociatedTokenAddressSync(input.mint, input.to, true, programId)
  return [
    createAssociatedTokenAccountIdempotentInstruction(input.from, toToken, input.to, input.mint, programId),
    createTransferInstruction(fromToken, toToken, input.from, input.amountIn, [], programId),
  ]
}

function memoInstruction(from: PublicKey, memo: string): TransactionInstruction {
  return new TransactionInstruction({
    keys: [{ pubkey: from, isSigner: true, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(memo, "utf8"),
  })
}
