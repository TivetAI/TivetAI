"use client";
import { DocsMobileNavigation } from "@/components/DocsMobileNavigation";
import logoUrl from "@/images/tivet-logos/icon-text-white.svg";
import {
	Button,
	Tooltip,
	TooltipArrow,
	TooltipContent,
	TooltipPortal,
	TooltipProvider,
	TooltipTrigger,
} from "@tivet-gg/components";
import { Header as TivetHeader } from "@tivet-gg/components/header";
import { Icon, faDiscord, faGithub } from "@tivet-gg/icons";
import Image from "next/image";
import Link from "next/link";
import { type ReactNode, useState } from "react";
import { HeaderPopupProductMenu } from "../HeaderPopupProductMenu";
import { HeaderSearch } from "./HeaderSearch";

interface HeaderProps {
	active: "product" | "docs" | "blog" | "pricing" | "solutions";
	subnav?: ReactNode;
	mobileBreadcrumbs?: ReactNode;
}

export function Header({ active, subnav }: HeaderProps) {
	const [ref, setRef] = useState<Element | null>(null);
	return (
		<TivetHeader
			className="lg:px-8 md:[&>div:first-child]:max-w-[calc(20rem+65ch+20rem)] md:[&>div:first-child]:px-0"
			logo={
				<Link href="/">
					<Image {...logoUrl} className="w-20" alt="Tivet logo" />
				</Link>
			}
			subnav={subnav}
			support={
				<div className="flex flex-col gap-4 font-v2 subpixel-antialiased">
					<TivetHeader.NavItem asChild>
						<Link href="https://hub.tivet.gg">Sign In</Link>
					</TivetHeader.NavItem>
					<TivetHeader.NavItem asChild>
						<Link href="/discord">Discord</Link>
					</TivetHeader.NavItem>
					<TivetHeader.NavItem asChild>
						<Link href="/support">Support</Link>
					</TivetHeader.NavItem>
				</div>
			}
			links={
				<>
					<HeaderSearch />
					<TivetHeader.NavItem asChild className="-m-2 p-2">
						<Link href="/discord">
							<Icon icon={faDiscord} />
						</Link>
					</TivetHeader.NavItem>
					<TivetHeader.NavItem asChild className="p-2">
						<Link
							href="https://github.com/tivet-gg/tivet"
							target="_blank"
						>
							<Icon icon={faGithub} />
						</Link>
					</TivetHeader.NavItem>
					<Button
						variant="outline"
						asChild
						className="font-v2 text-foreground subpixel-antialiased"
					>
						<Link href="https://hub.tivet.gg">Sign In</Link>
					</Button>
				</>
			}
			mobileBreadcrumbs={<DocsMobileNavigation />}
			breadcrumbs={
				<div
					className="flex items-center gap-6 font-v2 subpixel-antialiased"
					ref={(node) =>
						setRef(
							node
								?.closest("header")
								?.querySelector("div:first-child") || null,
						)
					}
				>
					<TooltipProvider delayDuration={0} skipDelayDuration={0}>
						<Tooltip key="product">
							<TooltipTrigger asChild>
								<div>
									<TivetHeader.NavItem className="flex items-center gap-1 py-2">
										<Link
											href="/docs"
											aria-current={
												active === "product"
													? "page"
													: undefined
											}
										>
											Product
										</Link>
									</TivetHeader.NavItem>
								</div>
							</TooltipTrigger>
							<TooltipPortal>
								<TooltipContent
									collisionPadding={32}
									collisionBoundary={ref}
									style={{
										width: "calc(var(--radix-popper-available-width)",
									}}
									className="h-full max-h-[190px] max-w-[800px] bg-card p-4"
								>
									<TooltipArrow className="h-2.5 w-5 fill-border" />
									<div className="h-full bg-card">
										<HeaderPopupProductMenu />
									</div>
								</TooltipContent>
							</TooltipPortal>
						</Tooltip>
						{/* <Tooltip delayDuration={0} key='solutions'>
              <TooltipTrigger asChild>
                <div>
                  <TivetHeader.NavItem asChild className='flex items-center gap-1 py-2'>
                    <Link href='/docs' aria-current={active === 'solutions' ? 'page' : undefined}>
                      Solutions
                    </Link>
                  </TivetHeader.NavItem>
                </div>
              </TooltipTrigger>
              <TooltipPortal>
                <TooltipContent
                  collisionPadding={32}
                  collisionBoundary={ref}
                  style={{ width: 'calc(var(--radix-popper-available-width)' }}
                  className='flex h-full min-h-[190px] max-w-[800px] bg-card p-4'>
                  <TooltipArrow className='h-2.5 w-5 fill-border' />
                  <div className='flex-1 justify-items-stretch bg-card'>
                    <HeaderPopupSolutionsMenu />
                  </div>
                </TooltipContent>
              </TooltipPortal>
            </Tooltip> */}
					</TooltipProvider>

					<TivetHeader.NavItem
						asChild
						className="flex items-center gap-1 py-2"
					>
						<Link
							href="/docs"
							aria-current={
								active === "docs" ? "page" : undefined
							}
						>
							Docs
						</Link>
					</TivetHeader.NavItem>
					<TivetHeader.NavItem
						asChild
						className="flex items-center gap-1"
					>
						<Link
							href="/changelog"
							aria-current={
								active === "blog" ? "page" : undefined
							}
						>
							Changelog
						</Link>
					</TivetHeader.NavItem>
					<TivetHeader.NavItem
						asChild
						className="flex items-center gap-1"
					>
						<Link
							href="/pricing"
							aria-current={
								active === "pricing" ? "page" : undefined
							}
						>
							Pricing
						</Link>
					</TivetHeader.NavItem>
				</div>
			}
		/>
	);
}
