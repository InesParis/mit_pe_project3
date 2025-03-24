function DSM = init_DSM(n,d,method)
%G   = round( rho*(n^2-n) );
G   = round( n*(d-1) );
%d   = rho*(n-1) + 1;
DSM = false(n,n);

%rand
%ideg
%odeg
%modu

% Set diagonal elements to true.
for i = 1:n
   DSM(i,i) = true;
end

%%% Random %%%
if method == 'rand'
   positionList = cell(n^2-n, 1);
   k = 0;
   for i = 1:n
      for j = [1:i-1,i+1:n]
         k = k+1;
         positionList{k} = [i,j];
      end
   end
   kshuffled = shuffle( [1 : n^2-n] );
   for k = kshuffled(1:G)
      v = positionList{k};
      DSM(v(1), v(2)) = true;
   end
end

%%% Fixed in-degree %%%
if method == 'ideg'
   for i = 1:n
      
      for pick = 1:d-1
         j = ceil(n * rand);
         while DSM(i,j) == true
            j = ceil(n * rand);
         end
         DSM(i,j) = true;
      end

      %ishuffled = shuffle( [1:i-1,i+1:n] );
      %for j = ishuffled(1:d-1)               % Pick e-1 other j's to depend on.
      %   DSM(i,j) = true;
      %end
   end
end

%%% Fixed out-degree %%%
if method == 'odeg'
   for i = 1:n
      ishuffled = shuffle( [1:i-1,i+1:n] );
      for j = ishuffled(1:d-1)               % Pick e-1 other j's to depend on.
         DSM(i,j) = true;
      end
   end
   DSM = DSM';
end

%%% Local method (chain) %%%
if method == 'loca'
   A = zeros(n,n);
   A(:) = 1:n^2;
   for k = 2:d
      DSM(diag(A,k-1)) = true;
      DSM(diag(A,k-n-1)) = true;
   end
end

%%% Centralized method %%%
if method == 'cent'
   A = zeros(n,n);
   A(:) = 1:n^2;
   A(diag(A)) = 0;
   offdiagset = nonzeros(A);
   DSM( offdiagset(1 : n*(d-1)) ) = true;
end

%%% Dependent method %%%
if method == 'depe'
   A = zeros(n,n);
   A(:) = 1:n^2;
   A(diag(A)) = 0;
   offdiagset = nonzeros(A);
   DSM( offdiagset(1 : n*(d-1)) ) = true;
   DSM = DSM';
end

%%% Modular method %%%
if method == 'modu'
   % params
   %n        = 100;
   %d        = 5;
   numparts = 3;
   alpha    = .85;

   r_in     = alpha / (1-alpha);

   % index matrix
   A = zeros(n,n);
   A(:) = [1:n^2];

   retry = true;
   while retry == true
      retry = false;

      % create module sets
      part = sort(ceil(n*rand(numparts-1,1)));
      part0 = [0; part];
      part1 = [part; n];
      parts = cell(numparts,1);
      for k = 1:numparts
         parts{k} = part0(k)+1 : part1(k);
      end
      %parts{:}

      % obtain diagset, inset, and outset.
      inset = [];
      for k = 1:numparts
         temp  = A(parts{k},parts{k});
         inset = [inset; temp(:)];
      end
      wholeset = A(:);
      diagset  = diag(A);
      inset    = setdiff( inset, diagset );
      outset   = setdiff( setdiff(wholeset,diagset), inset );

      n_in  = length(inset);
      D_tot = n*(d-1);
      D_in  = round( r_in/(r_in+1) * D_tot );
      D_out = D_tot - D_in;

      if D_out > length(outset)
         retry = true;
      end
   end

   % Construct DSM.
   inset = shuffle(inset);
   picks = inset(1:D_in);
   DSM(picks) = true;

   outset = shuffle(outset);
   picks = outset(1:D_out);
   DSM(picks) = true;

   DSM(diagset) = true;

   if false
      % draw matrix with module lines
      seematrix(DSM)
      hold on
      ends = [0; part1];
      for i = 1:numparts
         x0 = [ends(i)   ends(i)]   + .5;
         x1 = [ends(i+1) ends(i+1)] + .5;
         %y = [0 31];
         y = ends( i:i+1 ) + .5;
         plot( x0, y, 'k-')
         plot( y, x0, 'k-')
         plot( x1, y, 'k-')
         plot( y, x1, 'k-')
      end
      hold off
      if sum(sum(DSM)) == n*d
         disp('right # of black squares')
      else
         disp('wrong # of black squares')
      end
   end
end

if method == 'modp'
   modules = 3;

   % Assign different components to "component groups".
   Imod = sort( [ceil(rand(modules-1,1) * n); n] );
   component_group = zeros(n,1);

   component_group(1:Imod(1)) = 1;
   for k = 1:length(Imod)-1
      component_group( Imod(k)+1 : Imod(k+1) ) = k+1;
   end

   % Make connections between groups based on connection probabilties.
   p_g  = .2;
   p_ng = .05;
   for i = 1:n
      for j = [1:i-1, i+1:n]

         if component_group(i) ~= component_group(j)
            if rand < p_ng
               DSM(i,j) = true;
            end
         else
            if rand < p_g
               DSM(i,j) = true;
            end
         end

      end
   end
end

if false
   figure(3000)
   seematrix(DSM)
   set(gca, 'FontSize',14)
   title('Cost dependency matrix')
   ylabel('Affected cost')
   xlabel('Affecting component')
end