FROM clux/muslrust:1.81.0-stable AS rust

RUN ln -s /bin/g++ /bin/musl-g++ && \
	ln -s /bin/gcc-ar /bin/musl-ar

WORKDIR /app
COPY . .
RUN \
	--mount=type=cache,target=/root/.cargo/git \
	--mount=type=cache,target=/root/.cargo/registry \
	--mount=type=cache,target=/app/target \
	RUSTFLAGS="--cfg tokio_unstable" cargo build --release --bin tivet-client && \
	mkdir -p /app/dist && \
	mv /app/target/x86_64-unknown-linux-musl/release/tivet-client /app/dist/tivet-client

# Create an empty image and copy binaries into it to minimize the size of the image
FROM scratch
COPY --from=rust /app/dist/ /

# Allows `docker create` to work even though this fails
CMD [""]
