import { Readable } from "node:stream";
import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Helper to convert Node stream to Web stream
function nodeStreamToWebStream(nodeStream: Readable) {
	return new ReadableStream({
		start(controller) {
			nodeStream.on("data", (chunk) => controller.enqueue(chunk));
			nodeStream.on("end", () => controller.close());
			nodeStream.on("error", (err) => controller.error(err));
		},
		cancel() {
			nodeStream.destroy();
		},
	});
}

/**
 * Helper function: Consume a Web ReadableStream and return
 * the full content as a string.
 * This collects chunks of Uint8Arrays and decodes them.
 */
async function readStreamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value) chunks.push(value);
		}
	} finally {
		reader.releaseLock();
	}

	const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
	const allChunks = new Uint8Array(totalLength);

	let offset = 0;
	for (const chunk of chunks) {
		allChunks.set(chunk, offset);
		offset += chunk.length;
	}

	return new TextDecoder().decode(allChunks);
}

/**
 * Helper function: Stream S3 file and process each chunk with a callback.
 * Useful for line-by-line or chunk processing without buffering entire file.
 */
async function processS3StreamChunks(
	s3Client: S3Client,
	bucket: string,
	key: string,
	onChunk: (chunk: Uint8Array) => void,
) {
	const response = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));

	if (!response.Body) {
		throw new Error("No response body");
	}

	const nodeStream = response.Body as Readable;
	const webStream = nodeStreamToWebStream(nodeStream);
	const reader = webStream.getReader();

	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value) onChunk(value);
		}
	} finally {
		reader.releaseLock();
	}
}

/**
 * Example: Process the streamed content line by line.
 * This splits on newlines and calls onLine for each line.
 */
async function processStreamByLine(
	stream: ReadableStream<Uint8Array>,
	onLine: (line: string) => void,
) {
	const decoder = new TextDecoder();
	const reader = stream.getReader();

	let buffer = "";
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			if (value) {
				buffer += decoder.decode(value, { stream: true });
				let lines = buffer.split(/\r?\n/);
				buffer = lines.pop() || ""; // last partial line
				for (const line of lines) {
					onLine(line);
				}
			}
		}
		if (buffer.length > 0) {
			onLine(buffer);
		}
	} finally {
		reader.releaseLock();
	}
}

async function streamS3File(
	s3Client: S3Client,
	bucket: string,
	key: string,
): Promise<string> {
	try {
		const response = await s3Client.send(
			new GetObjectCommand({
				Bucket: bucket,
				Key: key,
			}),
		);

		if (!response.Body) {
			throw new Error("No response body");
		}

		const nodeStream = response.Body as Readable;
		const webStream = nodeStreamToWebStream(nodeStream);

		// Use the utility function to read the whole stream as string
		return await readStreamToString(webStream);
	} catch (error) {
		console.error("S3 streaming error:", error);
		throw error;
	}
}

async function main() {
	const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID;
	const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
	const awsRegion = process.env.AWS_REGION || "us-east-1";
	const awsEndpoint = process.env.AWS_ENDPOINT;

	if (!awsAccessKeyId) throw new Error("missing AWS_ACCESS_KEY_ID");
	if (!awsSecretAccessKey) throw new Error("missing AWS_SECRET_ACCESS_KEY");

	const s3Client = new S3Client({
		region: awsRegion,
		endpoint: awsEndpoint,
		credentials: {
			accessKeyId: awsAccessKeyId,
			secretAccessKey: awsSecretAccessKey,
		},
	});

	const bucket = process.argv[2];
	const key = process.argv[3];
	if (!bucket || !key) throw new Error("Usage: standalone_test.ts <bucket> <key>");

	console.log(`Streaming from S3: ${bucket}/${key}`);

	try {
		// Stream and read full content as string
		const content = await streamS3File(s3Client, bucket, key);
		console.log("Content length:", content.length);

		// Alternatively: Process chunks one by one
		console.log("\nProcessing chunks individually:");
		await processS3StreamChunks(s3Client, bucket, key, (chunk) => {
			console.log(`Chunk received: ${chunk.length} bytes`);
		});

		// Alternatively: Process line by line
		console.log("\nProcessing line by line:");
		const response = await s3Client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
		if (!response.Body) throw new Error("No response body");
		const nodeStream = response.Body as Readable;
		const webStream = nodeStreamToWebStream(nodeStream);
		await processStreamByLine(webStream, (line) => {
			console.log(`Line: ${line}`);
		});
	} catch (error) {
		console.error("Error:", error);
		process.exit(1);
	}
}

main();

// Prevent the script from exiting immediately to allow streaming to finish
setInterval(() => {}, 1000);
