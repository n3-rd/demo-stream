<script lang="ts">
	import { Facebook, Linkedin, Youtube } from 'lucide-svelte';
</script>

<div class="footer">
	<footer class=" bg-gray-100 py-8">
		<div
			class="container mx-auto flex flex-col items-start justify-between space-y-8 px-4 lg:flex-row lg:items-center lg:space-y-0 lg:px-8"
		>
			<!-- Logo and Social Media Links -->
			<div class="flex flex-col items-start space-y-4 lg:items-start">
				<img src="/logo/main-logo.svg" alt="ClearSky Software" class="h-12 w-auto" />
				<div class="flex space-x-4">
					<a href="/" class="text-gray-500 hover:text-gray-800">
						<Facebook class="h-6 w-6 text-primary" />
					</a>
					<a href="/" class="text-gray-500 hover:text-gray-800">
						<Linkedin class="h-6 w-6 text-primary" />
					</a>
					<a href="/" class="text-gray-500 hover:text-gray-800">
						<Youtube class="h-6 w-6 text-primary" />
					</a>
				</div>
				<p class="text-gray-500">Follow our social media.</p>
			</div>

			<!-- Navigation Links -->
			<div class="flex space-x-8 text-gray-500">
				<div class="flex flex-col space-y-2">
					<h4 class="font-bold text-gray-700">HOME</h4>
					<a href="/" class="hover:text-gray-800">About Us</a>
					<a href="/" class="hover:text-gray-800">Services</a>
				</div>
				<div class="flex flex-col space-y-2">
					<h4 class="font-bold text-gray-700">CATEGORIES</h4>
					<a href="/" class="hover:text-gray-800">Category 1</a>
					<a href="/" class="hover:text-gray-800">Category 2</a>
					<a href="/" class="hover:text-gray-800">Category 3</a>
				</div>
				<div class="flex flex-col space-y-2">
					<h4 class="font-bold text-gray-700">SPONSORS</h4>
					<a href="/" class="hover:text-gray-800">Argonaut Gold</a>
					<a href="/" class="hover:text-gray-800">Evolution</a>
					<a href="/" class="hover:text-gray-800">First Mining Gold</a>
					<a href="/" class="hover:text-gray-800">Kinross</a>
				</div>
			</div>

			<!-- Newsletter Subscription -->
			<div class="flex flex-col items-start space-y-4">
				<h4 class="font-bold text-gray-700">STAY UP TO DATE</h4>
				<p class="text-gray-500">Stay informed on how you can make a difference.</p>
				<div class="flex items-center overflow-hidden rounded-full border border-gray-300">
					<input
						type="email"
						placeholder="Your email address"
						class="px-4 py-2 text-gray-600 focus:outline-none"
					/>
					<button class="bg-blue-500 px-4 py-2 text-white">
						<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M14 5l7 7m0 0l-7 7m7-7H3"
							/>
						</svg>
					</button>
				</div>
			</div>
		</div>

		<!-- Footer Bottom -->
		<div
			class="container mx-auto mt-8 border-t px-4 pt-4 text-center text-sm text-gray-500 lg:px-8 lg:text-left"
		>
			<p>© 2024 All Rights Reserved - ClearSky Software</p>
		</div>
	</footer>
</div>
