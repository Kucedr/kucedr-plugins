// ponytail: stands in for shadcn's cn(); the static page has no Tailwind to merge.
export const cn = (...classes: (string | false | null | undefined)[]) =>
	classes.filter(Boolean).join(' ');
