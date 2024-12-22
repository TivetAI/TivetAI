import Image from "next/image";

import textBlack from "@/images/tivet-logos/icon-black.svg";

export function Logo({ ...props }) {
	return (
		<div {...props}>
			<Image
				src={textBlack}
				alt="Tivet"
				className="h-full w-auto dark:hidden"
			/>
			<Image
				src={textWhite}
				alt="Tivet"
				className="light:hidden h-full w-auto"
			/>
		</div>
	);
}
